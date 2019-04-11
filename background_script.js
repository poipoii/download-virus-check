'use strict';

if (!Promise.defer) {
  Promise.defer = function () {
    var deferred = {};
    var promise = new Promise(function (resolve, reject) {
      deferred.resolve = resolve;
      deferred.reject = reject;
    });
    deferred.promise = promise;
    return deferred;
  };
}

function logging() {
  if (false) {
    console.log.apply(console.log, arguments);
  }
}

var defaultApikey = '26c2e6f73ca56321b60df2f02b92bec014196d1b91ad8345db3db82a0c1630bc';
var apikey = '';
function updateApikey(_apikey) {
  if (_apikey.trim().length > 0) {
    apikey = _apikey;
    logging('use custom api key');
  } else {
    apikey = defaultApikey
    logging('use default api key');
  }
}
chrome.storage.local.get({
  apikey: ''
}, prefs => {
  logging(prefs);
  updateApikey(prefs.apikey)
});

var app = {
  callbacks: {}
};

var cache = {};

app.emit = (id, value) => {
  (app.callbacks[id] || []).forEach(callback => callback(value));
};
app.on = (id, callback) => {
  app.callbacks[id] = app.callbacks[id] || [];
  app.callbacks[id].push(callback);
};

var activeIDs = [];
var count = 0;

function getFileName(url) {
  var index = (url || '').lastIndexOf('/');
  if (index) {
    return url.substring(index + 1, url.length);
  }
  return 'filename';
}

var submittedToVirusTotal = function (json) {
  logging('submittedToVirusTotal', json);
  var scan_id = json.scan_id;
  var isFile = json.permalink.startsWith('https://www.virustotal.com/file/');
  var reportUrl = 'https://www.virustotal.com/gui/' + (isFile ? 'file/' : 'url/') + scan_id.substring(0, scan_id.indexOf('-')) + '/detection';
  logging('submittedToVirusTotal reportUrl', reportUrl);
  var notificationOptions = {
    type: 'basic',
    iconUrl: './icons/48.png',
    title: 'Download Virus Checker+',
    message: 'Submitted to VirusTotal.',
  };
  chrome.storage.local.get({
    autoOpenReport: '1'
  }, prefs => {
    if (prefs.autoOpenReport === '1') {
      chrome.tabs.create({url: reportUrl});
    }
  });
  chrome.notifications.create(reportUrl, notificationOptions, (notificationId) => {
    setTimeout(() => {
      chrome.notifications.clear(notificationId, function(){});
    }, 10000);
  });
}

var fileClean = function(obj) {
  chrome.storage.local.get({
    autoOpenReport: '1'
  }, prefs => {
    if (prefs.autoOpenReport === '0') {
      chrome.notifications.create(obj.scan_id, {
        type: 'basic',
        iconUrl: './icons/48.png',
        title: 'Download Virus Checker+',
        message: 'File clean: ' + obj.download.url.split('/').slice(-1)[0].split('?')[0] + '\npositives: ' + obj.positives,
      });
      logging('Link passed anti-virus check');
    }
  });
}

var post = (function () {
  let next = 0;

  app.on('reset-requested', () => {
    next = (new Date()).getTime() + 20000;
  });

  function run(url, data, resolve) {
    let req = new XMLHttpRequest();
    req.open('POST', url, true);
    req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
    req.onload = () => resolve({
      response: req.response,
      status: req.status
    });
    req.onerror = (e) => resolve({
      error: e.message || e || 'code ' + req.status,
      status: req.status
    });
    req.send(Object.entries(data).map(c => c[0] + '=' + encodeURIComponent(c[1]), '').join('&'));
  }

  return (url, data) => {
    let d = Promise.defer();
    let now = (new Date()).getTime();
    if (now > next) {
      run(url, data, d.resolve);
      next = now + 20000;
    } else {
      let id = window.setTimeout((url, data, resolve) => {
        run(url, data, resolve);
        let index = activeIDs.indexOf(id);
        if (index !== -1) {
          activeIDs.splice(index, 1);
        }
      }, next - now, url, data, d.resolve);
      activeIDs.push(id);
      next += 20000;
    }
    return d.promise;
  };
})();

var post_file = (function () {
  let next = 0;

  app.on('reset-requested', () => {
    next = (new Date()).getTime() + 20000;
  });

  function run(url, data, resolve) {
    let req = new XMLHttpRequest();
    req.open('POST', url, true);
    req.onload = () => resolve({
      response: req.response,
      status: req.status
    });
    req.onerror = (e) => resolve({
      error: e.message || e || 'code ' + req.status,
      status: req.status
    });
    logging(data);
    var formData = new FormData();
    formData.append('apikey', data.apikey);
    // limit 32 mb
    formData.append('file', new Blob([data.file], {type: 'octet/stream'}), data.filename);
    req.send(formData);
  }

  return (url, data) => {
    let d = Promise.defer();
    let now = (new Date()).getTime();
    if (now > next) {
      run(url, data, d.resolve);
      next = now + 20000;
    } else {
      let id = window.setTimeout((url, data, resolve) => {
        run(url, data, resolve);
        let index = activeIDs.indexOf(id);
        if (index !== -1) {
          activeIDs.splice(index, 1);
        }
      }, next - now, url, data, d.resolve);
      activeIDs.push(id);
      next += 20000;
    }
    return d.promise;
  };
})();

function scan(download) {
  return post('https://www.virustotal.com/vtapi/v2/url/scan', {
      url: download.url,
      apikey
    })
    .then(req => {
      // report back
      if (req.status === 204) {
        throw Error('virustotal -> scan -> exceeded the request rate limit');
      } else if (req.status !== 200) {
        throw Error('virustotal -> scan -> XMLHttpRequest rejection, code ' + req.status);
      } else if (req.error) {
        throw Error('virustotal -> scan -> XMLHttpRequest rejection, ' + req.error);
      } else if (!req.response) {
        throw Error('virustotal -> scan -> server returned empty response');
      }
      let json = JSON.parse(req.response);
      if (json.response_code === 0) {
        throw Error('virustotal -> scan -> server rejection, The requested resource is not among the finished, queued or pending scans');
      } else if (json.response_code !== 1) {
        throw Error('virustotal -> scan -> server rejection, ' + req.response.verbose_msg);
      }
      submittedToVirusTotal(json);
      return {
        download,
        permalink: json.permalink,
        scan_id: json.scan_id
      };
    });
}

function scan_file(download) {
  let d = Promise.defer();
  logging('scan_file', download.url);
  var req = new XMLHttpRequest();
  req.open('GET', download.url, true);
  req.onload = function () {
    if (req.readyState == XMLHttpRequest.DONE) {
      logging('xhr', req);
      d.resolve(post_file('https://www.virustotal.com/vtapi/v2/file/scan', {
        file: req.response,
        filename: getFileName(download.url),
        apikey: apikey
      })
      .then(req => {
        // report back
        if (req.status === 204) {
          throw Error('virustotal -> scan -> exceeded the request rate limit');
        } else if (req.status !== 200) {
          throw Error('virustotal -> scan -> XMLHttpRequest rejection, code ' + req.status);
        } else if (req.error) {
          throw Error('virustotal -> scan -> XMLHttpRequest rejection, ' + req.error);
        } else if (!req.response) {
          throw Error('virustotal -> scan -> server returned empty response');
        }
        let json = JSON.parse(req.response);
        if (json.response_code === 0) {
          throw Error('virustotal -> scan -> server rejection, The requested resource is not among the finished, queued or pending scans');
        } else if (json.response_code !== 1) {
          throw Error('virustotal -> scan -> server rejection, ' + req.response.verbose_msg);
        }
        logging(download, json);
        submittedToVirusTotal(json);
        return {
          download,
          permalink: json.permalink,
          scan_id: json.scan_id
        };
      }));
    }
  }
  req.onerror = (e) => d.reject({
    error: e.message || e || 'code ' + req.status,
    status: req.status
  });
  req.send();
  return d.promise;
}

function report(obj, index = 0) {
  logging('report', obj, index);
  var reportUrl = obj.permalink.startsWith('https://www.virustotal.com/url') ? 'https://www.virustotal.com/vtapi/v2/url/report' : 'https://www.virustotal.com/vtapi/v2/file/report'; 
  return post(reportUrl, {
      resource: obj.scan_id,
      apikey
    })
    .then(function (req) {
      logging('report', 'req', req);
      if (req.status === 204) {
        throw Error('virustotal -> report -> exceeded the request rate limit');
      } else if (req.status !== 200) {
        throw Error('virustotal -> report -> XMLHttpRequest rejection, code ' + req.status);
      } else if (!req.response) {
        throw Error('virustotal -> report -> server returned empty response');
      }
      let json = JSON.parse(req.response);
      if (json.response_code !== 1) {
        if (index > 30) {
          throw Error('virustotal -> report -> server rejection, ' + json.verbose_msg);
        }
        // report is not ready yet
        else {
          return report(obj, index + 1);
        }
      }

      return {
        download: obj.download,
        scan_id: json.scan_id,
        scan_date: json.scan_date,
        positives: json.positives,
        total: json.total,
        scans: json.scans,
        permalink: json.permalink
      };
    });
}

function perform(download) {
  logging('perform', download);
  chrome.storage.local.get({
    whitelist: 'audio, video, text/plain',
    scanMode: 'url',
    apikey: '',
    autoOpenReport: '1',
    scanStatus: '1'
  }, prefs => {
    let ignore = prefs.whitelist.split(', ').reduce((p, c) => p || download.mime.startsWith(c), false);
    if (!ignore && prefs.scanStatus == '1') {
      count += 1;
      app.emit('update-badge');
      updateApikey(prefs.apikey);
      logging('scanMode', prefs.scanMode);
      var action = prefs.scanMode == 'file' ? scan_file(download) : scan(download);
      (prefs.autoOpenReport == '1' ? action : action.then(report)).then(obj => {
        logging('obj', obj);
        let url = obj.download.url;

        chrome.storage.local.get({
          positives: 3
        }, prefs => {
          logging('prefs', prefs);
          if (obj.positives >= prefs.positives) {
            cache[url] = obj;

            let screenWidth = screen.availWidth;
            let screenHeight = screen.availHeight;
            let width = 500;
            let height = 600;

            chrome.windows.create({
              url: './detectedAction/index.html?url=' + encodeURIComponent(url),
              // focused: true,
              type: 'panel',
              width,
              height,
              left: Math.round((screenWidth - width) / 2),
              top: Math.round((screenHeight - height) / 2)
            });
          } else {
            fileClean(obj);
          }
          count -= 1;
          app.emit('update-badge');
        });
      }).catch(e => {
        logging('Unexpected error occurred', e);
        count -= 1;
        app.emit('update-badge');
      });
    } else {
      logging('Check is ignore', download.mime);
    }
  });
}
//
app.on('update-badge', () => chrome.browserAction.setBadgeText({
  text: count ? count + '' : ''
}));

//
chrome.runtime.onMessage.addListener((request, sender) => {
  logging(request);
  if (request.cmd === 'get-report') {
    chrome.downloads.search({
      id: cache[request.url].download.id
    }, downloads => {
      logging('downloads', downloads);
      chrome.tabs.sendMessage(sender.tab.id, {
        cmd: 'report',
        result: cache[request.url],
        download: downloads[0]
      });
      delete cache[request.url];
    });
  } else if (request.cmd === 'get-data') {
    chrome.runtime.sendMessage({
      cmd: 'get-data',
      count: count
    });
  } else if (request.cmd === 'abort-all-active-scans') {
    activeIDs.forEach(id => window.clearTimeout(id));
    count = 0;
    activeIDs = [];
    app.emit('reset-requested');
    app.emit('update-badge');
    chrome.runtime.sendMessage({
      cmd: 'get-data',
      count: count
    });
  }
});

// adding newly added download to the key list
chrome.downloads.onCreated.addListener(perform);

var debug = false;
var defaultApikey = '26c2e6f73ca56321b60df2f02b92bec014196d1b91ad8345db3db82a0c1630bc';
var logging = function () {
  if (debug) {
    console.log.apply(console.log, arguments);
  }
};
var getFileName = function (url) {
  var index = (url || '').lastIndexOf('/');
  if (index > 0 && index + 1 < url.length) {
    return url.substring(index + 1, url.length);
  }
  return 'filename';
};
var getReportURL = function (scan_id, permalink) {
  if (scan_id && permalink) {
    var isFile = permalink.startsWith('https://www.virustotal.com/file/');
    return 'https://www.virustotal.com/gui/' + (isFile ? 'file/' : 'url/') + scan_id.substring(0, scan_id.indexOf('-')) + '/detection';
  }
  return permalink;
};
var getSubmitReportURL = function (permalink) {
  if (permalink && typeof(permalink) == 'string') {
    return 'https://www.virustotal.com/vtapi/v2/' + (permalink.startsWith('https://www.virustotal.com/url') ? 'url' : 'file') + '/report';
  }
  return permalink;
};


try {
  module.exports = {
    debug: debug,
    defaultApikey: defaultApikey,
    logging: logging,
    getFileName: getFileName,
    getReportURL: getReportURL,
    getSubmitReportURL: getSubmitReportURL,
  };
} catch (error) {}
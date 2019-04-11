'use strict';

function logging() {
  if (false) {
    console.log.apply(console.log, arguments);
  }
}

chrome.runtime.onMessage.addListener(function (message, sender) {
  if (message.cmd === 'get-data') {
    var count = message.count || '0';
    document.querySelector('[data-id=count]').textContent = count;
    document.querySelector('[id=btn-abort]').disabled = +count < 1;
  }
});

chrome.runtime.sendMessage({
  cmd : 'get-data'
});

chrome.storage.local.get({
  scanMode: 'url',
  autoOpenReport: '1',
  scanStatus: '1'
}, prefs => {
  document.querySelector('[id=onoffswitch]').checked = prefs.scanMode == 'file';
  document.querySelector('[id=openreport]').checked = prefs.autoOpenReport == '1';
  document.querySelector('[id=playpause]').checked = prefs.scanStatus == '0';
});

var requestURL = '<all_urls>';

function callRequestPermissions() {
  logging('callRequestPermissions', requestURL);
  var scanMode = document.querySelector('[id=onoffswitch]').checked ? 'file' : 'url';
  logging('callRequestPermissions scanMode', scanMode);
  if (scanMode === 'file') {
    requestPermissions(requestURL);
  } else {
    removePermissions(requestURL);
  }
}

function requestPermissions(url) {
  logging('requestPermissions scanMode', url);
  chrome.permissions.request({
    origins: [url]
  }, function(granted) {
    logging('requestPermissions', url, granted);
    document.querySelector('[id=onoffswitch]').checked = granted;
  });
}

function removePermissions(url) {
  chrome.permissions.remove({
    origins: [url]
  }, function(granted) {
    logging('removePermissions', url, granted);
  });
}

document.getElementById('btn-abort').addEventListener('click', abortAllActiveScans);
function abortAllActiveScans() {
  chrome.runtime.sendMessage({
    cmd : 'abort-all-active-scans'
  });
}

document.getElementById('onoffswitch').addEventListener('change', scanModeChange);
// document.getElementById('onoffswitch').addEventListener('change', callRequestPermissions);
function scanModeChange(event) {
  var scanMode = event.target.checked ? 'file' : 'url';
  chrome.storage.local.set({
    'scanMode': scanMode
  }, () => {
    document.querySelector('[id=onoffswitch]').checked = scanMode == 'file';
  });
}

document.getElementById('openreport').addEventListener('change', autoOpenReportChange);
function autoOpenReportChange(event) {
  var autoOpenReport = event.target.checked ? '1' : '0';
  chrome.storage.local.set({
    'autoOpenReport': autoOpenReport
  }, () => {
    document.querySelector('[id=openreport]').checked = autoOpenReport == '1';
  });
}

document.getElementById('playpause').addEventListener('change', scanStatusChange);
function scanStatusChange(event) {
  var scanStatus = event.target.checked ? '0' : '1';
  chrome.storage.local.set({
    'scanStatus': scanStatus
  }, () => {
    document.querySelector('[id=playpause]').checked = scanStatus == '0';
  });
}
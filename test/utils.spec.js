var assert = require('chai').assert;
var utils = require('../utils/props.js');

var res = {
  scan_id: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f-1555163202',
  sha1: '3395856ce81f2b7382dee72602f798b642f14140',
  resource: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
  response_code: 1,
  sha256: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
  permalink: 'https://www.virustotal.com/file/275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f/analysis/1555163202/',
  md5: '44d88612fea8a8f36de82e1278abb02f',
  verbose_msg: 'Scan request successfully queued, come back later for the report'
};
var resReportURL = 'https://www.virustotal.com/gui/file/275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f/detection';

describe('utils', function () {
  it('debug is false', function () {
    assert.equal(utils.debug, false);
  });
  it('default api key', function () {
    assert.isTrue(utils.defaultApikey.length > 0);
  });
  describe('getFileName', function () {
    it('should return filename', function () {
      assert.equal(utils.getFileName('http://127.0.0.1/test.txt'), 'test.txt');
    });
    it('should return "filename"', function () {
      assert.equal(utils.getFileName('127.0.0.1'), 'filename');
    });
  });
  describe('getReportURL', function () {
    it('should return null', function () {
      assert.equal(utils.getReportURL(), null);
    });
    it('should return right url', function () {
      assert.equal(utils.getReportURL(res.scan_id, res.permalink), resReportURL);
    });
  });
  describe('getSubmitReportURL', function () {
    it('should return null', function () {
      assert.equal(utils.getSubmitReportURL(), null);
    });
    it('should return right url', function () {
      assert.equal(utils.getSubmitReportURL(res.permalink), 'https://www.virustotal.com/vtapi/v2/file/report');
    });
  });
});
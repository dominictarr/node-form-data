/*
test ranged fs.createReadStream
re: https://github.com/felixge/node-form-data/issues/71
*/

var common       = require('../common');
var assert       = common.assert;
var http         = require('http');
var fs           = require('fs');

var FormData     = require(common.dir.lib + '/form_data');
var IncomingForm = require('formidable').IncomingForm;

var testSubjects = {
  'a_file': {
    file: 'veggies.txt',
    start: 8,
    end: 18
  }, 'b_file': {
    file: 'veggies.txt',
    start: 6
  }, 'c_file': {
    file: 'veggies.txt',
    end: 16
  }, 'd_file': {
    file: 'veggies.txt',
    start: 0,
    end: 16
  }, 'e_file': {
    file: 'veggies.txt',
    start: 0,
    end: 0
  }
};

var server = http.createServer(function(req, res) {
  var requestBodyLength = 0;

  // calculate actual length of the request body
  req.on('data', function(data) {
      requestBodyLength += data.length;
  });

  var form = new IncomingForm({uploadDir: common.dir.tmp});

  form.parse(req);

  form
    .on('file', function(name, file) {

      // make sure total Content-Length is properly calculated
//      assert.equal(req.headers['content-length'], requestBodyLength);
      // make sure chunks are the same size
      assert.equal(file.size, testSubjects[name].readSize);
    })
    .on('end', function() {
      res.writeHead(200);
      res.end('done');
    });
});


server.listen(common.port, function() {
  var form = new FormData();
  var name, options;

  // add test subjects to the form
  for (name in testSubjects) {
    if (!testSubjects.hasOwnProperty(name)) continue;

    options = {encoding: 'utf8'};
    testSubjects[name].start && (options.start = testSubjects[name].start);
    testSubjects[name].end && (options.end = testSubjects[name].end);

    form.append(name, testSubjects[name].fsStream = fs.createReadStream(common.dir.fixture + '/' + testSubjects[name].file, options));

    // calculate data size
    testSubjects[name].readSize = 0;
    testSubjects[name].fsStream.on('data', function(data) {
      this.readSize += data.length;
    }.bind(testSubjects[name]));
  }

  form.submit('http://localhost:' + common.port + '/', function(err, res) {
    if (err) {
      throw err;
    }

    assert.strictEqual(res.statusCode, 200);

    // unstuck new streams
    res.resume();

    server.close();
  });

});

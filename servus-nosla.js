var  http = require('http'),
  rest = require('restler'),
  async = require('async'),
  haml = require('haml');
  url = require('url'),
  fs = require('fs');

//templating
var searchResHamlTemplate;
fs.readFile('./search-res.haml', function(e, c) {
  searchResHamlTemplate = c.toString();
});

http.createServer(function (req, res) {
  process.addListener('uncaughtException', function (err) {
    console.log('Caught exception: ' + err);
    res.writeHead(500, 'text/plain');
    res.end('error!');
  });

  var serviceUrls = {};
  serviceUrls.goo	= 'http://ajax.googleapis.com/ajax/services/search/web?v=1.0&q=';
  serviceUrls.twit = 'http://search.twitter.com/search.json?q=';
  var urlParsed = url.parse(req.url, true);
  var path = urlParsed.pathname;

  switch(path) {
    case '/':
      res.writeHead(200, {'Content-Type': 'text/plain'});
      res.end('Let\'s aggregate!');
      break;
    case '/aggregate':
      //extract search predicate
      var query = urlParsed.query;
      if(query != undefined) {
        predicate = query.q;
      } else {
        res.writeHead(400); 
        res.end('Query expected. Use q=... in the URL');
        return;
      }
      async.parallel(buildParallelFuncArray(),
        function (err, results) {
          res.writeHead(200, {'Content-Type': 'text/html'});
          var searchItems = [];
          for(i=0;i<results.length;i++) {
            for(sr in results[i]) {
              searchItems.push(results[i][sr]);
            }
          }
          res.end(haml.render(searchResHamlTemplate, {locals: {items: searchItems}}));
        });
      break;
    default:
      res.writeHead(404);
      res.end('Not Found!');
  }

  function buildParallelFuncArray() {
    var getResourceFunc = [];
    for(var sn in serviceUrls) {
      getResourceFunc.push(function(serviceName) {
        return function(callback) {
          callRestService(serviceUrls[serviceName] + predicate, serviceName, callback);
        };
      }(sn));
    }
    return getResourceFunc;
  }

  function callRestService(url, serviceName, callback) {
    request = rest.get(url);
    request.addListener('success', function(data) {
      searchResults = [];
      if(serviceName == 'goo') {
        dataJson = JSON.parse(data).responseData.results;
        for(sr in dataJson) {
          searchResult = {}
          searchResult.url = dataJson[sr].url;
          searchResult.text = dataJson[sr].title;
          searchResults.push(searchResult);
        }
      } else if(serviceName == 'twit') {
        dataJson = data.results;
        for(sr in dataJson) {
          searchResult = {}
          searchResult.url = 'http://twitter.com/' + dataJson[sr].from_user + '/status/' + dataJson[sr].id;
          searchResult.text = dataJson[sr].text;
          searchResults.push(searchResult);
        }
      }
      callback(null, searchResults);
    });
    request.addListener('error', function(data) {
      console.log('Error fetching [' + url + ']. Body:\n' + data);
      callback(null, ' ');
    });
  }

}).listen(8124, "127.0.0.1");
console.log('Server running at http://127.0.0.1:8124/');

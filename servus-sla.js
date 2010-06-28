var sys = require('sys'),
	http = require('http'),
	rest = require('./restler/lib/restler'),
	async = require('./async/lib/async'),
	haml = require('./haml-js/lib/haml');
	url = require('url'),
	fs = require('fs');

		//templating
		var searchResHamlTemplate;
		fs.readFile('./search-res.haml', function(e, c) {
				searchResHamlTemplate = c.toString();
			});

		var sla = parseInt(process.argv[2]);
		var sla = isNaN(sla) ? 2000 : sla;	//2s or the first argument in the command line
		sys.puts('Sla is: ' + sla);

http.createServer(function (req, res) {
		process.addListener('uncaughtException', function (err) {
	  	sys.puts('Caught exception: ' + err);
			res.writeHead(500, 'text/plain');
			res.end('error!');
		});

		var serviceUrls = {};
		serviceUrls.goo	= 'http://ajax.googleapis.com/ajax/services/search/web?v=1.0&q=';
		serviceUrls.twit = 'http://search.twitter.com/search.json?q=';
		var urlParsed = url.parse(req.url, true);
		var path = urlParsed.pathname;

		var partialResults = [];
	  var timeoutReached = false;

		switch(path) {
			case '/':
				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.end('Hello World\n');
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

				async.parallel(buildParallelFuncArrayWithSla());
			break;
			default:
				res.writeHead(404);
				res.end('Not Found!');
		}

		function buildParallelFuncArrayWithSla() {
			var funz = [];
			for(var sn in serviceUrls) {
				funz.push(function(serviceName) {
					return function(callback) {
	          callRestService(serviceUrls[serviceName] + predicate, serviceName, callback);
        	};
				}(sn));
			}
      //will invoke callback after timeout
			funz.push(function(callback) {
				setTimeout(function() {
					if(!timeoutReached) {
						//serve search results if any
						serveContent(partialResults);
						sys.puts("Timeout reached");
					}
				}, sla);
			});
			return funz;
		}

		function serveContent(results) {
			res.writeHead(200, {'Content-Type': 'text/html'});
			var searchItems = [];
			for(i=0;i<results.length;i++) {
				for(sr in results[i]) {
					searchItems.push(results[i][sr]);
				}
			}
			res.end(haml.render(searchResHamlTemplate, {locals: {items: searchItems}}));
			timeoutReached = true;	//prevent further search results to be processed
		}

		function callRestService(url, serviceName, callback) {
				sys.puts(serviceName);
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

					 partialResults.push(searchResults);
					 if(partialResults.length ==  2 && !timeoutReached) {
				     sys.puts("Timeout not reached");
						 serveContent(partialResults);
					 }
				});
				request.addListener('error', function(data) {
					sys.puts('Error fetching [' + url + ']. Body:\n' + data);
					callback(null, ' ');
				});
		}

}).listen(8124, "127.0.0.1");
sys.puts('Server running at http://127.0.0.1:8124/');

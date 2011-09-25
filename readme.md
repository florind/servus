Servus: A content aggregation server in < 120 LOC
=============

Web service that aggregates content from different sources in an asynchronous manner. Full description of the service: 

		http://blog.newsplore.com/2010/06/27/building-a-content-aggregation-service-with-node-js

Modules needeed:
* restler
* async
* haml-js

Install & run
=============

To install dependencies, run:
		npm install

Run the server:
		node servus.js <sla>

where <sla> is the service level timeout that forces a client request to return with partial results after the timeout. If no sla is specified the default is 2 sec.

To test the aggregation server:

		http://127.0.0.1:8124/aggregate?q=worldcup

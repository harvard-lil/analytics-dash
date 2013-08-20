var lc = lc || {};

lc.search = function() {

	var getQueryVariable = function(variable) {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i=0;i<vars.length;i++) {
            var pair = vars[i].split("=");
            if (pair[0] == variable) {
                return pair[1];
            }
        }
        return(false);
    };

    var baseurl = 'http://librarycloud.law.harvard.edu/v1/api/item/',
        api = baseurl + '?filter=collection:hollis_catalog&filter={filter}:{keyword}&limit=250&facet=pub_date_numeric&key=5239997b68e033fbf2854d77c6295310',
        search = getQueryVariable('search') || 'los angeles';

    var graphTitle = d3.select("#searchTerm")

    $("#search").click(function() {
        search = $("#search-field").val();
        graphTitle.text("Searching for... '"+search+"'");
        runSearch("lcsh_keyword",search);
    });

    self.getSearchTerm = function() {
    	return search;
    }

	self.runSearch = function(filter, keyword) {
    	var url = api.replace('{filter}',filter).replace('{keyword}',keyword);
        $.ajax({
            url: url,
            success: function(response) {
                lc.graph.dataPrep(response.docs);

                graphTitle.text(filter+": "+keyword);

             	lc.graph.drawArea(response.facets);
            	lc.graph.appendCircles(response.docs);
                lc.histogram.appendHistogram(response.docs);
            }
        });
    };

    // initial search request
    self.runSearch("lcsh_keyword", search);

    return self;
}();
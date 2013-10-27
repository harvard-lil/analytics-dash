var lc = lc || {};

lc.search = function() {

    $("#show-search").click(function(){
        $("#search-form").toggle();
    });

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
        defaultFilters = {
            'limit': 250,
            'facet': 'pub_date_numeric',
            'key': '5239997b68e033fbf2854d77c6295310'
        },
        defaultParams = '&limit=250&facet=pub_date_numeric&key=5239997b68e033fbf2854d77c6295310&filter:collection:hollis_catalog',
        search = getQueryVariable('search') || 'los angeles';

    var graphTitle = d3.select("#searchTerm")

    // dewey_call_nu
    // pub_date_numeric
    $("#search").click(function() {
        console.log("searching...");
        var searchTerms = {};
        $("#search-form input").each(function(){
            var t = $(this);
            if (t.val()) {
                var key = t.attr("id").split("-")[1];
                searchTerms[key] = t.val();
            }
        });

        console.log('searching ', searchTerms);

        self.runSearch(searchTerms);

        graphTitle.text("Searching for... '" + searchTerms + "'");
    });

    self.buildSearchQuery = function(terms) {
        var query = [];
        for (var term in terms) {
            switch (term) {
                case 'year':
                    var range = terms[term].split('-');
                    query.push('filter=pub_date_numeric:[' + range[0] + ' TO ' + range[1] + ']');
                    console.log('year range', range);
                    break;
                case 'range':
                    // loc_call_num_sort_order
                    var range = terms[term].split('-');
                    query.push('filter=loc_call_num_sort_order:[' + range[0] + ' TO ' + range[1] + ']');
                    console.log('call number range', range);
                    break;

                case 'title':
                case 'creator':
                case 'subject':
                    query.push('filter=' + term + '_keyword:' + terms[term]);
                    break;

                default:
                    // filter=collection:hollis_catalog
                    query.push('filter=' + term + ':' + terms[term]);
                    break;
            }
        }
        return encodeURI('&' + query.join('&'));
    };

    self.getSearchTerm = function() {
        return search;
    };

    self.runSearch = function(parameters) {
        var query = self.buildSearchQuery(parameters);
        var url = baseurl + '?' + defaultParams + query;

        console.log('searching', query);

        lc.list.hideList();
        $.ajax({
            url: url,
            success: function(response) {
                console.log('response', response.docs.length, 'results');
                if (!response.docs.length) {
                    console.log('zero results, bailing');
                    return;
                }

                lc.graph.dataPrep(response.docs);

                graphTitle.text(query); // for now

                // lc.graph.drawArea(response.facets);

                lc.graph.appendCircles(response.docs);

                lc.histogram.appendHistogram(response.docs);

                lc.list.saveDocs(response.docs);

                d3.select("#graph svg").attr("class","");
            }
        });
    };

    // initial search request
    self.runSearch({'lcsh_keyword': 'los angeles'});

    return self;
}();
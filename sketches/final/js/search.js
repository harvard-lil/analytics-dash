var lc = lc || {};

lc.search = function() {

    $("#show-search").click(function(){
        $("#search-form").slideToggle();
    });

    $("#search-form .clear").click(function(){
        // $(this).parent().toggleClass("locked");
        $(this).parent().removeClass("filled").find("input").val("");
    });
    $("#search-form .result-sort").click(function(){
        $("#search-form .result-sort").removeClass("selected");
        $(this).addClass("selected");
    });

    $("#search-form").keypress(function(e){
        if ( event.which == 13 ) {
            self.submitSearch();
        }
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
        defaultParams = '&limit=250&facet=pub_date_numeric&key=5239997b68e033fbf2854d77c6295310&filter:collection:hollis_catalog',
        search = getQueryVariable('search') || 'Boston';

    var graphTitle = $("#searchTerm");

    $("#search").click(function() {
        self.submitSearch(); 
    });

    self.submitSearch = function() {
        var searchTerms = {};
        searchTerms["year"] = [],
        searchTerms["range"] = [];

        // grabbing all fields entered in in the form
        $("#search-form input").each(function() {
            var t = $(this);
            console.log(t, t.val());
            if (t.val()) {
                // grabbing #search-year -> 'year'
                var key = t.attr("id").split("-")[1];
                if (key == "year_0" || key == "year_1")
                    searchTerms["year"][key.split("_")[1]] = t.val();
                else if (key == "range_0" || key == "range_1")
                    searchTerms["range"][key.split("_")[1]] = t.val();
                else
                    searchTerms[key] = t.val();
                t.parent().addClass("filled");
            } else {
                t.parent().removeClass("filled");
            }
        });

        $("#search-form select").each(function() {
            var t = $(this);
            if (t.find(":selected") && t.prop('selectedIndex') != 0) {
                var key = t.attr("id").split("-")[1];
                searchTerms[key] = t.find(":selected").text();
                // if (!t.parent().hasClass("locked")) t.prop('selectedIndex',0);;
            }
        });

        console.log('searching ', searchTerms);

        self.runSearch(searchTerms);

        $("#search-form").slideUp();

        graphTitle.html("Searching... ");
    };

    /*
        build out a query string of Solr filters for the Item API
        http://www.librarycloud.org/api-item
    */
    self.buildSearchQuery = function(terms) {
        var query = [];
        for (var term in terms) {
            switch (term) {
                // parsing '2001-2004' to 'filter=pub_date_numeric:[2001 TO 2004]'
                case 'year':
                    var range = terms[term];
                    if (range.length == 2) {
                        query.push('filter=pub_date_numeric:[' + range[0] + ' TO ' + range[1] + ']');
                        console.log('year range', range);
                    }
                    break;

                // using loc_call_num_sort_order until told otherwise
                case 'range':
                    var range = terms[term];
                    if (range.length == 2) {
                        query.push('filter=loc_call_num_sort_order:[' + range[0] + ' TO ' + range[1] + ']');
                        console.log('call number range', range);
                    }
                    break;

                // upper case the first letter, sigh
                case 'format':
                    var format = terms[term];
                    var uppercased = format.charAt(0).toUpperCase() + format.slice(1);
                    query.push('filter=' + term + ':' + uppercased);
                    break;

                case 'holding_libs':
                    var lib = terms[term].split(" - ")[0];
                    query.push('filter=' + term + ':' + lib);
                    break;

                // doing fuzzy keyword search on these
                case 'title':
                case 'creator':
                case 'subject':
                    query.push('filter=' + term + '_keyword:' + terms[term]);
                    break;

                // 'collection': 'hollis_catalog' -> 'filter=collection:hollis_catalog'
                default:
                    query.push('filter=' + term + ':' + terms[term]);
                    break;
            }
        }
        return encodeURI('&' + query.join('&'));
    };

    self.buildSearchExplanation = function(docs, terms) {
        var prefix = 'The <b>' + docs.length + ' most popular</b> items ';
        if (terms['collection']) {
            var catalog = terms['collection'].split('_').join(' ');
            prefix += ' in the ' + catalog;
        }

        console.log('making explanation', terms);
        var explanation = [];
        for (var term in terms) {
            switch (term) {
                // parsing '2001-2004' to 'filter=pub_date_numeric:[2001 TO 2004]'
                case 'year':
                    var range = terms[term];
                    if (range.length == 2) {
                        explanation.push('published <b>between ' + range[0] + ' and ' + range[1] + '</b>');
                        console.log('year range', range);
                    }
                    break;

                // using loc_call_num_sort_order until told otherwise
                case 'range':
                    var range = terms[term];
                    if (range.length == 2) {
                        explanation.push('a Library of Congress Call Number <b>between ' + range[0] + ' and ' + range[1] + '</b>');
                    }
                    break;

                case 'format':
                    var format = terms[term];
                    if (format == 'Notated Music') {
                        format = 'piece of music';
                    } else if (format == 'Book Part') {
                        format = 'book parts';
                    } else if (format == 'Other') {
                        format = 'other items';
                    } else {
                        format = format.split(' ').pop().split('/').pop().toLowerCase() + 's';
                    }
                    prefix = prefix.replace('</b> items ', ' ' + format + '</b> ');
                    break;

                case 'holding_libs':
                    var lib = terms[term].split(" - ")[1];
                    explanation.push('found in the ' + lib + ' collection');
                    break;

                // doing fuzzy keyword search on these
                case 'title':
                    explanation.push('whose title contains ' + terms[term]);
                    break;
                case 'creator':
                    explanation.push('created by <b>' + terms[term] + '</b>');
                    break;
                case 'language':
                    explanation.push('in <b>' + terms[term] + '</b>');
                    break;
                case 'lcsh_keyword':
                case 'lcsh':
                case 'subject':
                    explanation.push('about <b>' + terms[term] + '</b>');
                    break;

                default:
                    explanation.push('with ' + term + ' matching ' + terms[term]);
                    break;
            }
        }

        return prefix + explanation.join(', ') + '.';
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
                    graphTitle.html("0 Results found with your parameters.");
                    console.log('zero results, bailing');
                    return;
                }


                lc.graph.dataPrep(response.docs);

                /*
				var graphLabel = "The graph below displays the in our";
				var queries = query.split('&filter=');
				var secondhalf = queries[1];
				var thingToPrint = "";

  				for (var i=1;i<queries.length;i++) {
					console.log(queries[i]);
					var typeAndTerm = queries[i];
					var typeOfTerm = (typeAndTerm.split(':')[0]);
					console.log(typeOfTerm);
					var term = (typeAndTerm.split(':')[1]);
					console.log(term);
					thingToPrint= thingToPrint + typeOfTerm +term+"'";
					thingToPrint = thingToPrint.replace(/lcsh_keyword/gi, "library of Congress Keyword is ");
					thingToPrint = thingToPrint.replace(/pub_date_numeric/gi, "publication date is between");
					thingToPrint = thingToPrint.replace(/TO/gi, "and ");
					thingToPrint = thingToPrint.replace(/creator/gi, "author is ");
					thingToPrint = thingToPrint.replace(/collection/gi, "publication date is ");
					fixedThingToPrint= unescape(thingToPrint);
        		}
                graphTitle.text('The graph below displays the 250 most popular items in our collection that meet your criteria: ' + fixedThingToPrint); // for now
                */

                $(".sort-heading").find(".total").text(response.docs.length);

                graphTitle.html(self.buildSearchExplanation(response.docs, parameters));

                // lc.graph.drawArea(response.facets);

                lc.subjectgraph.reset();

                lc.graph.appendCircles(response.docs);

                lc.histogram.appendHistogram(response.docs);

                lc.list.saveDocs(response.docs);

                d3.select("#graph svg").attr("class","");
            }
        });
    };

    // initial search request
    self.runSearch({'lcsh_keyword': 'boston'});

    return self;
}();
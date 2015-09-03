var lc = lc || {};

lc.search = function() {
	
		// pdmod
		var response_docs_length = 0;

    var searchForm = $("#search-form");
    var searchTerms = {},
        previousSearches = [],
        searchIndex = 0;

    $("#search-lcsh_keyword").focus(function(){
        searchForm.find("#search-fold").slideDown();
    });
    searchForm.find(".hide-search").click(function(){
       searchForm.find("#search-fold").slideUp(); 
    });
    
    // pdmod (20150902)
    $("#form-submit").click(function(){
    	searchForm.find("#search-fold").slideUp();
    });

    searchForm.find(".clear").click(function(){
        $(this).parent().removeClass("filled").find("input").val("");
    });
    $("#search-form .result-sort").click(function(){
        $("#search-form .result-sort").removeClass("selected");
        $(this).addClass("selected");
    });

    $("#search-form").keypress(function(e){
        if ( event.which == 13 ) {
            self.submitSearch("search-form");
            $(this).find("input").blur();
        // pdmod (20150902)
				searchForm.find("#search-fold").slideUp();            
        }
    });
    $("#welcome").keypress(function(e){
        if ( event.which == 13 ) {
            self.submitSearch("welcome");
            $("#welcome").fadeOut();
            $("#shield").fadeOut();
        }
    });

		/* pdmod (20150902)
    $(document).click(function(e){
        if (e.pageY > 345 || e.pageX > 545)
            searchForm.find("#search-fold").slideUp();
    });
    */

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
    var baseurl = 'http://hlslwebtest.law.harvard.edu/v1/api/item',
        cachedParams = '&limit=250&facet=pub_date_numeric&key=5239997b68e033fbf2854d77c6295310&filter=collection:hollis_catalog',
        defaultParams = '&limit=250&facet=pub_date_numeric&key=5239997b68e033fbf2854d77c6295310&filter=collection:hollis_catalog',
        search = getQueryVariable('search') || 'Boston';
		// suffix = '&filter=call_num:*&filter=loc_call_num_sort_order:*'
    var graphTitle = $("#searchTerm");

    $(".search").click(function() {
        var id = $(this).parent().attr("id");
        self.submitSearch(id);
    });

    var start = 250;
    $(".more").click(function(){
        if ($(this).hasClass("inactive")) return;
        addMoreResults();
    });

    function addMoreResults() {
        var subjectString = lc.subjectgraph.returnSubjectString(),
            newTerms = {};

        for (item in searchTerms) {
            newTerms[item] = searchTerms[item];
        }

        if (subjectString && newTerms["loc_call_num_subject_keyword"] != subjectString) 
            newTerms["loc_call_num_subject_keyword"] = subjectString;
        else {
        	
        		// pdmod (20150903): changed both start tests below to 500 from 750 to fix paging
            if (start > 500) return;

            if (start == 500) lc.subjectgraph.toggleInactive(true);
            
            start += 250;

            defaultParams = "&start="+start+defaultParams;
            self.runSearch(newTerms, true);
            return;
        }

        self.runSearch(newTerms);
    }

    self.submitSearch = function(id) {
        searchTerms = {};
        searchTerms["year"] = [],
        searchTerms["range"] = [];
        //start = 250;
        start = 0;
        lc.subjectgraph.toggleInactive(false);
        defaultParams = cachedParams;

        // grabbing all fields entered in in the form
        $("#"+id+" input").each(function() {
            var t = $(this);
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

        $("#"+id+" select").each(function() {
            var t = $(this);
            if (t.find(":selected") && t.prop('selectedIndex') != 0) {
                var key = t.attr("id").split("-")[1];
                searchTerms[key] = t.find(":selected").text();
            }
        });

        self.runSearch(searchTerms);

				// pdmod (20150902)
        /* $("#search-fold").slideUp(); */
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
                    }
                    break;

                // using loc_call_num_sort_order until told otherwise
                case 'range':
                    var range = terms[term];
                    if (range.length == 2) {
                        query.push('filter=loc_call_num_sort_order:[' + range[0] + ' TO ' + range[1] + ']');
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
                    query.push('filter=main_' + term + '_keyword:' + terms[term]);
                    break;
                                    
                case 'loc_call_num_subject':
                    query.push('filter=' + term + '_keyword:' + terms[term]);
                    break;

                case 'creator':
                case 'subject':
                    var words = terms[term].split(" ");
                    words.forEach(function(e,i){ 
                        query.push('filter=' + term + '_keyword:' + e);
                    })
                    break;

                // 'collection': 'hollis_catalog' -> 'filter=collection:hollis_catalog'
                default:
                    query.push('filter=' + term + ':' + terms[term]);
                    break;
            }
        }
        return encodeURI('&' + query.join('&'));
    };

    self.buildSearchExplanation = function(docs, terms, num_found) {
        var prettyNumber = d3.format("0,000");
        if (docs.length < num_found)
            var prefix = 'The <b>' + (oldData.length) + ' most popular</b> items out of ' + prettyNumber(num_found);
        else
            var prefix = '<b>' + (oldData.length) + '</b> items';
        if (terms['collection']) {
            var catalog = terms['collection'].split('_').join(' ');
            prefix += ' in the ' + catalog;
        }

        var explanation = [];
        for (var term in terms) {
            switch (term) {
                // parsing '2001-2004' to 'filter=pub_date_numeric:[2001 TO 2004]'
                case 'year':
                    var range = terms[term];
                    if (range.length == 2) {
                        explanation.push(' published <b>between ' + range[0] + ' and ' + range[1] + '</b>');
                    }
                    break;

                // using loc_call_num_sort_order until told otherwise
                case 'range':
                    var range = terms[term];
                    if (range.length == 2) {
                        explanation.push(' a Library of Congress Call Number <b>between ' + range[0] + ' and ' + range[1] + '</b>');
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
                    prefix = prefix.replace('items', ' <b>' + format + '</b>');
                    break;

                case 'holding_libs':
                    var lib = terms[term].split(" - ")[1];
                    explanation.push(' found in the ' + lib + ' collection');
                    break;

                // doing fuzzy keyword search on these
                case 'title':
                    explanation.push(' whose title contains ' + terms[term]);
                    break;
                case 'creator':
                    explanation.push(' created by <b>' + terms[term] + '</b>');
                    break;
                case 'language':
                    explanation.push(' in <b>' + terms[term] + '</b>');
                    break;
                case 'loc_call_num_subject_keyword':
                    explanation.push(' with a call number subject of <b>' + terms[term] + '</b>');
                    break;
                case 'lcsh_keyword':
                case 'lcsh':
                case 'subject':
                    explanation.push(' about <b>' + terms[term] + '</b>');
                    break;

                default:
                    explanation.push(' with ' + term + ' matching ' + terms[term]);
                    break;
            }
        }
            return prefix + explanation.join(',') + '.';
    };

    $(".next-search").click(function(){
        if (searchIndex == previousSearches.length || previousSearches.length == 1) return;
        searchIndex += 1;
        runSearch(previousSearches[searchIndex]);
        updateSearchUI();
    });
    $(".prev-search").click(function(){
        if (searchIndex == 0) return;
        searchIndex -= 1;
        runSearch(previousSearches[searchIndex]);
        updateSearchUI();
    });
    function updateSearchUI() {
        if (previousSearches.length == 1) return;
        if (searchIndex > 0)
            $(".prev-search").removeClass("inactive");
        else
            $(".prev-search").addClass("inactive");
        if (searchIndex < previousSearches.length-1)
            $(".next-search").removeClass("inactive");
        else
            $(".next-search").addClass("inactive");
    }

    var oldData = [];

    // I'm so sorry
    function hasObjectInArray(object, array) {
        var exists = false;
        array.forEach(function(d,i){
            if ($.isEmptyObject(d) && !$.isEmptyObject(object)) return;
            var innerMatch = true;
            for (x in d) {
                if (d[x] != object[x]) innerMatch = false;
            }
            if (innerMatch) exists = true;
        });
        return exists;
    }

    self.runSearch = function(parameters, noReset) {
        if (noReset) {
            for (p in searchTerms) {
                parameters[p] = searchTerms[p];
            }
        }

        if (!hasObjectInArray(parameters, previousSearches)) {
            previousSearches.push(parameters);
            searchIndex = previousSearches.length-1;
        }
        graphTitle.html("Searching... ");
        updateSearchUI();
        var query = self.buildSearchQuery(parameters);
        var url = baseurl + '?' + defaultParams + query;// + suffix;

        var hash = [];
        for (param in parameters) {
            if (parameters[param].length)
                hash.push(param+"="+parameters[param]);
        }
        window.location.hash = hash.join("&");

        self.clearCircles();
        lc.subjectgraph.reset();
        lc.graph.clearInspector();

        lc.list.hideList();
        $.ajax({
        		dataType: "jsonp",
            url: url,
            success: function(response) {
                if (!response.docs.length) {
                    graphTitle.html("0 Results found with your parameters.");
                    lc.subjectgraph.toggleInactive(true);
                    return;
                }

								// pdmod (20150903)
								response_docs_length = response.docs.length;
            		if (response_docs_length < 250) lc.subjectgraph.toggleInactive(true);

								// pdmod (20150903)
                //var notMore = (response.num_found == response.docs.length) || (start == 1000);
                //lc.subjectgraph.toggleInactive(notMore);

                lc.graph.dataPrep(response.docs);

                $(".sort-heading").find(".total").text(response.docs.length);

                if (noReset) {
                    var newData = oldData.concat(response.docs);
                } else {
                    newData = response.docs;
                    lc.subjectgraph.reset();
                }
                oldData = newData;

                graphTitle.html(self.buildSearchExplanation(response.docs, parameters, response.num_found));

                lc.subjectgraph.finishedNesting = false;
                lc.subjectgraph.updateRelative(newData, newData.length, 0);
                
                lc.graph.appendCircles(newData);

                lc.histogram.appendHistogram(newData);

                if (noReset) {
                    if ("loc_call_num_subject_keyword" in searchTerms)
                        lc.subjectgraph.setSubjectString(searchTerms["loc_call_num_subject_keyword"]);
                }

                d3.select("#graph svg").attr("class","");
            }
        });
    };

    // initial search request
    window.location.hash.substr(1,window.location.hash.length)
        .split("&").forEach(function(d,i){
            if (!d.length) return;
            var terms = d.split("=");
            if (terms[0] == "year" || terms[0] == "range") {
                var a = terms[1].split(",");
                searchTerms[terms[0]] = [a[0],a[1]];
            } else    
                searchTerms[terms[0]] = terms[1];
        });
    self.runSearch(searchTerms);

    return self;
}();

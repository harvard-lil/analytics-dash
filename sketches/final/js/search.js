var lc = lc || {};

lc.search = function() {

    var searchForm = $("#search-form");
    var searchTerms = {},
        previousSearches = [],
        searchIndex = 0;

    $("#search-lcsh_keyword").focus(function(){
        searchForm.find("#search-fold").slideDown();
    })
    searchForm.find(".hide-search").click(function(){
       searchForm.find("#search-fold").slideUp(); 
    })

    searchForm.find(".clear").click(function(){
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
            $(this).find("input").blur();
        }
    });

    $(document).click(function(e){
        if (e.pageY > 345 || e.pageX > 545)
            searchForm.find("#search-fold").slideUp();
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

    var baseurl = 'http://librarycloud.harvard.edu/v1/api/item',
        cachedParams = '&limit=250&facet=pub_date_numeric&key=5239997b68e033fbf2854d77c6295310&filter:collection:hollis_catalog',
        defaultParams = '&limit=250&facet=pub_date_numeric&key=5239997b68e033fbf2854d77c6295310&filter:collection:hollis_catalog',
        search = getQueryVariable('search') || 'Boston';
		// suffix = '&filter=call_num:*&filter=loc_call_num_sort_order:*'
    var graphTitle = $("#searchTerm");

    $(".search").click(function() {
        self.submitSearch(); 
    });

    var start = 0;
    $(".more").click(function(){
        addMoreResults();
    });

    function addMoreResults() {
        var subjectString = lc.subjectgraph.returnSubjectString(),
            yearRange = lc.histogram.returnYearRange(),
            newTerms = {};

        for (item in searchTerms) {
            newTerms[item] = searchTerms[item];
        }

        if (subjectString) newTerms["loc_call_num_subject_keyword"] = subjectString;
        if (yearRange) newTerms["year"] = yearRange;

        /*
            if new search is same as old, increment
            search history:
                do we store history?
                is it just the original search?
                is it a bunch of queries?
                dedupe
        */

        if (!subjectString && !yearRange) {
            start += 250;
            if (start > 750) return;
            else if (start == 750) {
                $(this).addClass("inactive");
            }
            defaultParams = "&start="+start+defaultParams;
            self.runSearch(newTerms, true);
            return;
        }

        self.runSearch(newTerms, false);
    }

    self.submitSearch = function() {
        searchTerms = {};
        searchTerms["year"] = [],
        searchTerms["range"] = [];
        start = 0;
        $(".more").removeClass("inactive");
        defaultParams = cachedParams;

        // grabbing all fields entered in in the form
        $("#search-form input").each(function() {
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

        $("#search-fold").slideUp();

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

    self.buildSearchExplanation = function(docs, terms) {
        var prefix = 'The <b>' + (oldData.length) + ' most popular</b> items ';
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
                        explanation.push('published <b>between ' + range[0] + ' and ' + range[1] + '</b>');
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
                case 'loc_call_num_subject_keyword':
                    explanation.push('with a call number subject of <b>' + terms[term] + '</b>');
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

    $(".next-search").click(function(){
        if (searchIndex == previousSearches.length) return;
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
        if (previousSearches.length == 0) return;
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

    self.runSearch = function(parameters, noReset) {
        if (noReset) {
            for (p in searchTerms) {
                parameters[p] = searchTerms[p];
            }
        }
        if (previousSearches.indexOf(parameters) == -1) {
            previousSearches.push(parameters);
            searchIndex = previousSearches.length-1;
        }
        updateSearchUI();
        var query = self.buildSearchQuery(parameters);
        var url = baseurl + '?' + defaultParams + query;// + suffix;

        console.log('searching', query);
        self.clearCircles();

        lc.list.hideList();
        $.ajax({
            url: url,
            success: function(response) {
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

                // lc.graph.drawArea(response.facets);

                if (noReset) {
                    var newData = oldData.concat(response.docs);
                } else {
                    newData = response.docs;
                    lc.subjectgraph.reset();
                }
                oldData = newData;

                graphTitle.html(self.buildSearchExplanation(response.docs, parameters));

                lc.subjectgraph.finishedNested = false;
                lc.subjectgraph.updateRelative(newData, newData.length, 0);
                
                lc.graph.appendCircles(newData);

                lc.histogram.appendHistogram(newData);

                if (noReset) {
                    if ("loc_call_num_subject_keyword" in searchTerms)
                        lc.subjectgraph.setSubjectString(searchTerms["loc_call_num_subject_keyword"]);
                    if ("year" in searchTerms && searchTerms["year"].length)
                        lc.histogram.setYearRange(searchTerms["year"]);
                }

                // lc.list.saveDocs(newData);

                d3.select("#graph svg").attr("class","");
            }
        });
    };

    // initial search request
    searchTerms = {'lcsh_keyword': 'doctor'};
    self.runSearch(searchTerms);

    return self;
}();
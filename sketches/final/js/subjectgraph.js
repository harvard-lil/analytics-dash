/*

        Here's where we'll ping the LC Class api, get the appropriate children at each level
        and update the Y Axis of graph.js if necessary. This is replacing subjectsorter.js
        and stalactites.js, but using some similar ideas

*/
var lc = lc || {};

lc.subjectgraph = function() {
    var self = d3.dispatch("click", "mouseover", "mouseout", "selected"),
            baseurl = 'http://hlslwebtest.law.harvard.edu/v1/api/lc_class/',
            height = $(window).height() - 320,
            selected = null,
            sideBar = d3.select("#nav"),
            context = d3.select("#nav-context"),
            breadcrumb = $("#breadcrumb");

    $("#graph-reset").click(function(){
        self.reset();
    });

    self.search = function(query) {
        $.ajax({
        				dataType: "jsonp",
                url: baseurl + '?' + encodeURI(query),
                success: function(response){
                    var classes = response.docs[0].child_classes;
                    d3.selectAll(".schema").each(function(d){
                        classes.forEach(function(e){
                            var id = e.split("%%")[4];
                            if (d.key == id) {
                                d.id = id;
                            }
                        })
                    })
                }
        });
    };

    self.getChildren = function(parent) {
        self.search('filter=parent_class:' + parent);
    };
    self.getChildrenID = function(parentID) {
        self.search('filter=parent_class_id:' + parentID);
    };

    var getID = function(d) {
            var id = d.lastname.toLowerCase();
            return id.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
                                .replace(/\s+/g, '-') // collapse whitespace and replace by -
                                .replace(/-+/g, '-'); // collapse dashes
    };

    self.finishedNesting = false;

    self.updateRelative = function(data, numBooks, depth) {

        self.relative = true;

        var nested = d3.nest()
            .key(function(d){
                if (!d.loc_call_num_subject) return;
                var k = d.loc_call_num_subject[0].split(" -- ")[depth];
                return k;
            }).rollup(function(d){

                // for (var i = 0; i < d.length; i++) {
                for (var i = d.length-1; i > -1; i--) {
                    if (d[i].call_num && d[i].loc_call_num_sort_order[0]) {
                        return {
                            "call_num":d[i].call_num[0], 
                            "sort_order":d[i].loc_call_num_sort_order[0],
                            "length":d.length,
                            "depth":depth,
                            "books":d 
                        };
                    }
                }
                return {
                    "call_num":"undefined", 
                    "length":d.length,
                    "depth":depth,
                    "books":d 
                };
            }).entries(data);
        
        nested.sort(function(a,b){
            if (a.values.sort_order < b.values.sort_order) return -1;
            if (a.values.sort_order > b.values.sort_order) return 1;
            return 0;
        });

        // pushing grey ones to the bottom of the graph
        for (var i = nested.length-1; i--; 0) {
            if (nested[i].key == "undefined" || nested[i].key == "unavailable") {
                var p = nested.splice(i,1);
                nested.push(p[0]);
            }
        }

        self.relativeClasses = nested;

        // reset
        if (depth == 0) {
            breadcrumb.find(".all").click(function(){
                lc.graph.appendCircles(data);
                self.updateRelative(data, data.length, 0);
                breadcrumb.find(".bc-wrapper").hide();
            });
            $("#nav-context").hide();
        } else {
            $("#nav-context").show();
        }

        var div = (depth == 0) ? "#nav" : "#nav-context";

        var groups = d3.select(div).selectAll(".schema")
            .data(nested);

        var entering = groups.enter()
            .append("g")
            .attr("class", "schema");

        groups.exit().remove();

        var rectangles = entering.append("rect").attr("width","30");

        var hy = 0;
        groups.attr("id",function(d){
            d.className = classNameify(d.key);
            return d.className;
        })
        groups.select("rect").attr("height",function(d){
            d.height = (d.values.length/numBooks) * height;
            return d.height;
        }).attr("y",function(d){
            d.values.class = d.key;
            d.y = hy;
            hy += d.height;
            return d.y;
        }).attr("fill", function(d) {
            if (d.key != "undefined" && d.key != "unavailable" && lcObjectArray[d.values.call_num.substr(0,1)])
                return lcObjectArray[d.values.call_num.substr(0,1)].color;
            else
                return "#666";
        }).on("click",function(d){
            self.updateRelative(d.values.books, d.values.length, d.values.depth+1);
            lc.graph.appendCircles(d.values.books);
            self.crumbize(d.values);
        });

        self.getChildren("top-level class");

        var texts = d3.select("#graph-labels").selectAll("text").data(nested);
        texts.enter().append("text");
        texts.exit().remove();

        var yOffset = height,
            ty = 0;

        texts.attr("x", (depth == 0) ? 0 : 30)
            .attr("y",function(d){
                d.height = (d.values.length / numBooks) * height;
                d.cy = ty;
                ty += d.height;
                return d.cy + 10;
            }).text(function(d){
                return showProperTitle(d.key, d.values.depth);
            }).attr("class",function(d){
                return d.className;
            }).style("display","none");

        for (var i = texts[0].length; i--; 0) {
            d3.select(texts[0][i]).each(function(d){
                if (yOffset - d.cy < 15) return;
                yOffset = d.cy;
                d3.select(this).style("display","block");
            })
        }

        // if no more data to drill down
        if (nested.length == 1 && !self.finishedNesting) {
            var needsNesting = false;
            nested[0].values.books.forEach(function(e,i){
                if (!e.loc_call_num_subject) return;
                var l = e.loc_call_num_subject[0].split(" -- ").length;
                if (l > depth) {
                    needsNesting = true;
                }
            })
            if (!needsNesting) return;

            $(".item.all").addClass("dead").unbind("click");
            $(".link.secondary").eq(depth-1).addClass("dead").unbind("click");
            var d = nested[0];
            d.values.class = d.key;
            self.crumbize(d.values, true);
            
            self.updateRelative(d.values.books, d.values.length, d.values.depth+1);
        } else {
            self.finishedNesting = true;
        }
    };

    self.crumbize = function(d) {
        if (d.class == "undefined" && d.depth > 0) return;

        var breadDepth = breadcrumb.find(".secondary") ? breadcrumb.find(".secondary").length : 0;
        var l = $("<span>").attr("class","link secondary")
                .html("<span class='tick'>></span><span class='item'>"+d.class+"</span>")
                .click(function(){
                    self.updateRelative(d.books, d.length, d.depth+1);
                    lc.graph.appendCircles(d.books);
                    breadcrumb.find(".link.secondary").each(function(i,e){
                        if (i > d.depth) $(this).remove();
                    });
                });

        breadcrumb.find(".more").text("show more in this category");

        if (d.depth < breadDepth) breadcrumb.find(".link.secondary").remove();
        else if (d.depth == breadDepth) breadcrumb.find(".link.secondary").eq(d.depth).remove();

        if (d.class == "undefined") l.css("color","#666");
        else if (d.depth == 0) l.css("color",lcObjectArray[d.call_num.substr(0,1)].color);

        breadcrumb.find(".bc-wrapper").show().append(l);
    };

    self.returnSubjectString = function() {
        var trail = [];
        breadcrumb.find(".item").each(function(i,e){
            if (i == 0) return;
            trail.push($(e).text())
        });
        return trail.join(" -- ");
    }
    self.setSubjectString = function(subjectStr) {
        var trail = subjectStr.split(" -- ");
        for (var i = 0; i < trail.length; i++) {
            d3.select("#"+classNameify(trail[i]))
            .each(function(d){
                self.updateRelative(d.values.books, d.values.length, d.values.depth+1);
                lc.graph.appendCircles(d.values.books);
                self.crumbize(d.values);
            });
        }
    }

    function classNameify(name) {
        return "t-"+String(name).replace(/^\s+|\s+$/g,'').toLowerCase().replace(/[^\w\s]/gi, '').split(" ").join("-");name.toLowerCase().replace(/^\s+|\s+$/g,'').replace(/[^\w\s]/gi, '').split(" ").join("-");
    }
    function showProperTitle(key, depth) {
        if (depth == 0 && key == "undefined") return "No Call Number Available";
        else if (key == "undefined") return "No Further Categories";
        else return key;
    }

    self.updateBounds = function(selected) {
        var cy = 0,
        matchedPosition = 0,
        matchedHeight = 0;

        for (var i = 0; i < self.rootChildren.length; i++) {
            var rootClass = self.rootChildren[i];
            var rootHeight = percentHeight = (rootClass.count / self.rootTotal) * height;
            if (rootClass.start <= selected.start && rootClass.end >= selected.end) {
                    matchedPosition = cy;
                    matchedPosition += ((selected.start - rootClass.start) / rootClass.count) * rootHeight;
                    matchedHeight = (selected.count / rootClass.count) * rootHeight;
            }
            cy += percentHeight;
        }
    };

    // caching this highlighted object so we're not creating new ones on mousemove
    var highlighted = {};
    self.rollover = function(cy) {
        var currentClass;
        if (!self.relativeClasses) return;
        
        self.relativeClasses.forEach(function(e,i){
            if (cy > e.y) {
                currentClass = e;
                return;
            }
        });
		// self.show();
        d3.select("#graph-labels").style("display","none");
        var rollover = d3.select("#rollover").style("display","block");

        rollover.attr("transform","translate(0,"+currentClass.y+")")
            .select("rect")
            .attr("width","100%")
            .attr("height", currentClass.height);

        var ctx = self.relative ? currentClass.values : currentClass.class;

        rollover.select("text")
            .attr("x",(ctx.depth == 0) ? 3 : 33)
            .text(showProperTitle(currentClass.key, currentClass.values.depth));
            //.attr("fill",schema.colorClass(currentClass.class.class));
    };
    self.rollout = function() {
        d3.select("#graph-labels").style("display","block");
        d3.select("#rollover").style("display","none")
            .select("text").text("");
    };


    // dive into the subject classes based on a click on the graph
    self.graphClick = function(cy) {
        var d;
        self.relativeClasses.forEach(function(e,i){
            if (cy > e.y) {
                d = e;
                return;
            }
        });
        if (d.key == "undefined" && d.values.depth > 0) return;
        self.updateRelative(d.values.books, d.values.length, d.values.depth+1);
        lc.graph.appendCircles(d.values.books);
        self.crumbize(d.values);

    };

    self.getChildY = function(cy) {
        var currentPosition = 0,
            matchedPosition = 0,
            matchedHeight = 0,
            children = self.currentChildren || self.rootChildren,
            total = self.currentTotal || self.rootTotal;

        highlighted.class = null;
        highlighted.height = null;
        highlighted.y = cy;

        if (!children || !children.length) {
            // nothing to look for yet
            return highlighted;
        }

        for (var i = 0; i < children.length; i++) {
            var currentClass = children[i];
            var rootHeight = percentHeight = (currentClass.count / total) * height;
            if (currentPosition <= cy && currentPosition + rootHeight >= cy) {
                highlighted.class = currentClass;
                highlighted.height = rootHeight
                highlighted.y = currentPosition;

                return highlighted;
            }
            currentPosition += percentHeight;
        }

        return highlighted;
    };

    self.calculateY = function(sort_number) {
            var cy = 0,
            matchedPosition = 0,
            matchedHeight = 0,
            children = self.currentChildren || self.rootChildren,
            total = self.currentTotal || self.rootTotal;

            for (var i = 0; i < children.length; i++) {
                    var currentClass = children[i];
                    
                    // get the height of the current class rectangle
                    var rootHeight = (currentClass.count / total) * height;

                    // and if the sort number matches
                    if (currentClass.start <= sort_number && currentClass.end >= sort_number) {
                            matchedPosition = cy;

                            // add percentage height of the sortnumber within the current class
                            matchedPosition += ((sort_number - currentClass.start) / currentClass.count) * rootHeight;
                            return matchedPosition;
                    }
                    
                    cy += rootHeight;
            }
            return cy+100;
    };

    self.toggleInactive = function(inactive) {
        breadcrumb.find(".more").toggleClass("inactive",inactive);
    };

    self.reset = function() {
            breadcrumb.find(".link.secondary").remove()
            breadcrumb.find(".bc-wrapper").hide();
            breadcrumb.find(".more").text("show more matching items");
            $(".item.all").removeClass("dead");
    };
    self.hide = function() {
            $("#nav").hide();
            $("#nav-context").hide();
            $("#labels").hide();
    };
    self.show = function() {
            $("#nav").show();
            $("#nav-context").show();
            $("#labels").show();
    };

    return self;
}();

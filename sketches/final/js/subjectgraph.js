/*

        Here's where we'll ping the LC Class api, get the appropriate children at each level
        and update the Y Axis of graph.js if necessary. This is replacing subjectsorter.js
        and stalactites.js, but using some similar ideas

*/
var lc = lc || {};

lc.subjectgraph = function() {
    var self = d3.dispatch("click", "mouseover", "mouseout", "selected"),
            baseurl = 'http://hlslwebtest.law.harvard.edu/v1/api/lc_class/',
            height = $("#nav").height()-10,
            selected = null,
            sideBar = d3.select("#nav"),
            context = d3.select("#nav-context"),
            breadcrumb = $("#breadcrumb");

    $("#graph-reset").click(function(){
        self.reset();
    });

    self.search = function(query) {
        // $.ajax({
        //         url: baseurl + '?' + encodeURI(query),
        //         success: self.searchCompleted
        // });
    };

    self.getChildren = function(parent) {
        self.search('filter=parent_class:' + parent);
    };
    self.getChildrenID = function(parentID) {
        self.search('filter=parent_class_id:' + parentID);
    };

    /*
        very hacky code to patch holes because some categories say their end
        is in the 8 millions, screwing up the structure
    */
    var globalDepth = 0;

    var processChild = function(childString, next) {
            var values = childString.split('%%');
            var nameparts = values[3].split('--');
            var parts = nameparts.length-1;
            var lastname = nameparts[parts];
            globalDepth = parts;
            return {
                    'class': values[0],
                    'start': +values[1],
                    'end'  : next ? next.start - 1 : +values[2],
                    'count': next ? (next.start - 1) - values[1] : values[2] - values[1],
                    'name' : values[3],
                    'id'   : values[4],
                    'depth' : parts,
                    'lastname' : nameparts[parts]
            };
    };

    var getID = function(d) {
            var id = d.lastname.toLowerCase();
            return id.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
                                .replace(/\s+/g, '-') // collapse whitespace and replace by -
                                .replace(/-+/g, '-'); // collapse dashes
    };

    self.searchCompleted = function(response) {
            var processedChildren = [],
                    total = 0;

            // parse through all child classes
            for (var j = 0; j < response.docs.length; j++) {
                var parent = response.docs[j];
                var child_classes = parent.child_classes;
                for (var i = 0; i < child_classes.length; i++) {
                    var next = self.initialized || i+1 == child_classes.length ? null : processChild(child_classes[i+1]);
                    var child = processChild(child_classes[i], next);
                    total += child.count;
                    processedChildren.push(child);
                }
            }

            if (!self.initialized) {
                    self.rootChildren = processedChildren;
                    self.rootTotal = total;
                    self.update(context, processedChildren, total);
                    self.initialized = true;
            } else {
                    self.currentChildren = processedChildren;
                    self.currentTotal = total;
                    self.update(sideBar, processedChildren, total);
                    lc.graph.updateLabels(globalDepth);
            }

            self.selected();
    };

    self.update = function(parent, data, total) {
        var child = false;
        if (parent.node().id == "nav"){
            d3.select("#graph-wrapper").classed("child",true);
            child = true;
        }

        var groups = parent.selectAll(".schema")
            .data(data);

       var texts = d3.select("#graph-labels").selectAll("text").data(data);
       texts.enter().append("text");
       texts.exit().remove();
      
        var entering = groups.enter()
            .append("g")
            .attr("class", "schema");

        var rectangles = entering.append("rect");

        var cy = 0;

        groups.attr("id", function(d) { return getID(d); })
            .attr("transform",function(d){
                d.height = (d.count / total) * height;
                d.cy = cy;
                cy += d.height;

                return "translate(0,"+d.cy+")";
            });

        groups.select("rect").attr("width",30)
            .attr("fill", function(d) {
                return schema.colorClass(d.class);
            }).attr("height", function(d) {
                return d.height;
            });

        var yOffset = 0,
            ty = 0;

        texts.attr("x", child ? 30 : 0)
            .attr("y",function(d){
                d.height = (d.count / total) * height;
                d.cy = ty;
                ty += d.height;
                return d.cy + 10;
            }).text(function(d){
                if (d.cy - yOffset < 15) return;
                yOffset = d.cy;
                return d.key;
            }).attr("class",function(d){
                return classNameify(d.key);
            });

            // .attr("fill", function(d) {
            //     return schema.colorClass(d.class);
            // });

        groups.on("mouseover", function(d) {
        // console.log(d,e,i, d3.event)
         // self.mouseover(d);
            self.rollover(d3.event.offsetY);
        })
        groups.on("mouseout", function(d) {
         // self.mouseout(d);
            self.rollout();
        });

        // groups.select("rect")
        //     .transition()
        //     .attr("width", 30);

        groups.on("click", function(d) {
            self.getChildrenID(d.id);
            self.updateBounds(d);

            crumbize(d);

            // d3.selectAll(".schema").classed("selected",false);
            // d3.select(this).classed("selected",true);
            // this.parentNode.appendChild(this);
        });

        lc.graph.updateLabels(globalDepth);
        d3.select("#rollover")
            .attr("width", 0)

        // remove divs when they leave
        groups.exit().remove();

    };

    self.updateRelative = function(data, numBooks, depth) {

        self.relative = true;

        // reset
        if (depth == 0) {
            breadcrumb.find(".all").click(function(){
                lc.graph.appendCircles(data);
                self.updateRelative(data, data.length, 0);
                breadcrumb.hide();
            });
            $("#nav-context").hide();
        } else {
            $("#nav-context").show();
        }

        var nested = d3.nest()
            .key(function(d){
                if (!d.loc_call_num_subject) return;
                var k = d.loc_call_num_subject.split(" -- ")[depth];
                return k;
            }).rollup(function(d){
                for (var i = 0; i < d.length; i++) {
                    if (d[i].call_num) {
                        return {
                            "call_num":d[i].call_num[0], 
                            "length":d.length,
                            "depth":depth,
                            "books":d 
                        };
                    }
                }
                return {"call_num":"undefined", "length":d.length};
            }).entries(data);

        nested.forEach(function(d,i){
            if (d.key == "unavailable") {
                d.values.call_num = "undefined";
            }
        });

        // if no more data to drill down
        if (nested.length == 1 && nested[0].key == "undefined") return;
        
        nested.sort(function(a,b){
            if (a.values.call_num.substr(0,1) < b.values.call_num.substr(0,1)) return -1;
            if (a.values.call_num.substr(0,1) > b.values.call_num.substr(0,1)) return 1;
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
            if (d.key == "undefined")
                d.height = (data.length-numBooks)/data.length * height;
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
                return d.key;
            }).attr("class",function(d){
                return d.className;
            }).style("display","none");

        for (var i = texts[0].length-1; i--; 0) {
            d3.select(texts[0][i]).each(function(d){
                if (yOffset - d.cy < 15) return;
                yOffset = d.cy;
                d3.select(this).style("display","block");
            })
        }
    };

    self.crumbize = function(d) {
        if (d.class == "undefined") return;

        var breadDepth = breadcrumb.find(".link") ? breadcrumb.find(".link").length : 0;
        var l = $("<span>").attr("class","link")
                .html("<span class='tick'>></span><span class='item'>"+d.class+"</span>")
                .click(function(){
                    // self.getChildrenID(d.id);
                    // self.updateBounds(d);
                    self.updateRelative(d.books, d.length, d.depth+1);
                    lc.graph.appendCircles(d.books);
                    breadcrumb.find(".link").each(function(i,e){
                        if (i > d.depth) $(this).remove();
                    });
                });

        if (d.depth + 1 < breadDepth) breadcrumb.find(".link").remove();
        else if (d.depth + 1 == breadDepth) breadcrumb.find(".link").eq(d.depth).remove();

        if (d.depth == 0) l.css("color",schema.colorClass(d.call_num));

        breadcrumb.show().append(l);
    };

    function classNameify(name) {
        return "t-"+String(name).replace(/^\s+|\s+$/g,'').toLowerCase().replace(/[^\w\s]/gi, '').split(" ").join("-");name.toLowerCase().replace(/^\s+|\s+$/g,'').replace(/[^\w\s]/gi, '').split(" ").join("-");
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
        // currentClass = self.getChildY(cy);
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
            .text(self.relative ? currentClass.key : currentClass.class.name);
            //.attr("fill",schema.colorClass(currentClass.class.class));
    };
    self.rollout = function() {
        d3.select("#graph-labels").style("display","block");
        d3.select("#rollover").style("display","none")
            .select("text").text("");
    };


    // dive into the subject classes based on a click on the graph
    self.graphClick = function(cy) {
        // var currentClass = self.getChildY(cy);
        // self.getChildrenID(currentClass.class.id);
        // self.crumbize(currentClass.class);
        var d;
        self.relativeClasses.forEach(function(e,i){
            if (cy > e.y) {
                d = e;
                return;
            }
        });
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

    self.reset = function() {
            self.currentChildren = null;
            self.currentTotal = null;
            self.initialized = false;
            globalDepth = 0;
            self.update(sideBar, []);
            breadcrumb.hide();
            d3.select("#graph-wrapper").classed("child",false);
            d3.selectAll(".schema").classed("selected",false);
            self.getChildren("top-level class");
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

    self.getChildren("top-level class");

    return self;
}();
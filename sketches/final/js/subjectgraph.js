/*

        Here's where we'll ping the LC Class api, get the appropriate children at each level
        and update the Y Axis of graph.js if necessary. This is replacing subjectsorter.js
        and stalactites.js, but using some similar ideas

*/
var lc = lc || {};

lc.subjectgraph = function() {
    var self = d3.dispatch("click", "mouseover", "mouseout", "selected"),
            baseurl = 'http://hlslwebtest.law.harvard.edu/v1/api/lc_class/',
            height = $("#nav").height(),
            selected = null,
            sideBar = d3.select("#nav"),
            context = d3.select("#nav-context");

    self.search = function(query) {
            $.ajax({
                    url: baseurl + '?' + encodeURI(query),
                    success: self.searchCompleted
            });
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
    var processChild = function(childString, next) {
            var values = childString.split('%%');
            var nameparts = values[3].split('--');
            var parts = nameparts.length-1;
            var lastname = nameparts[parts];
            return {
                    'class': values[0],
                    'start': +values[1],
                    'end'  : next ? next.start - 1 : +values[2],
                    'count': next ? (next.start - 1) - values[1] : values[2] - values[1],
                    'name' : values[3],
                    'id'   : values[4],
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
            }

            self.selected();
    };

    self.update = function(parent, data, total) {

        var rects = parent.selectAll(".schema").data(data);

        var grouping = rects.enter()
                .append("g")
                .attr("class", "schema");

        var rectangles = grouping.append("rect")
            .attr("width",0);

        var texts = grouping.append("text").attr("x", 34);

        var yoffset = -6;
        var cy = 0;

        grouping.attr("id", function(d) { return getID(d); })
            .attr("transform",function(d){
                d.height = (d.count / total) * height;
                d.cy = cy;
                cy += d.height;

                return "translate(0,"+d.cy+")";
            });

        rectangles.attr("fill", function(d) {
                return schema.colorClass(d.class);
            }).attr("height", function(d) {
                return d.height;
            });

        texts.text(function(d){
                return d.lastname;
            }).attr("fill", function(d) {
                return schema.colorClass(d.class);
            });

        // rectangles.on("mouseover", function(d) {
        //     self.mouseover(d);
        // })
        // .on("mouseout", function(d) {
        //     self.mouseout(d);
        // });

        rectangles.transition()
            .duration(500)
            .attr("width", 30);

        rects.on("click", function(d) {
            console.log('clicked', d.name, d.id);
            self.getChildrenID(d.id);
            self.updateBounds(d);

            d3.selectAll(".schema").classed("selected",false);
            d3.select(this).classed("selected",true);
            this.parentNode.appendChild(this);
        });

        // remove divs when they leave
        rects.exit().remove();
    };

    self.updateBounds = function(selected) {

        console.log(selected);
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

    self.calculateY = function(sort_number) {
            var cy = 0,
                    matchedPosition = 0,
                    matchedHeight = 0,
                    children = self.currentChildren || self.rootChildren,
                    total = self.currentTotal || self.rootTotal;

            for (var i = 0; i < children.length; i++) {
                    var currentClass = children[i];
                    if (currentClass.start <= sort_number && currentClass.end >= sort_number) {
                            matchedPosition = cy;
                            matchedPosition += ((sort_number - currentClass.start) / currentClass.count) * rootHeight;
                            return matchedPosition;
                    }
                    var rootHeight = percentHeight = (currentClass.count / total) * height;
                    cy += percentHeight;
            }

            return cy;
    };

    self.reset = function() {
            self.getChildren("top-level class");
    };
    self.hide = function() {
            $("#nav").hide();
            $("#nav-context").hide();
    };
    self.show = function() {
            $("#nav").show();
            $("#nav-context").show();
    };

    self.getChildren("top-level class");

    return self;
}();
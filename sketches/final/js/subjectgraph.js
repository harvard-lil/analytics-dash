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

	var processChild = function(childString) {
		var values = childString.split('%%');
		return {
			'class': values[0],
			'start': +values[1],
			'end'  : +values[2],
			'count': values[2] - values[1],
			'name' : values[3],
			'id'   : values[4]
		};
	};

	var getID = function(d) {
		var id = d.name.toLowerCase();
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
				var child = processChild(child_classes[i]);
				total += child.count;
				processedChildren.push(child);
			}
		}

		console.log(total, response);

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
	};

	self.update = function(parent, data, total) {
		var rects = parent.selectAll("rect.schema")
			.data(data);

		rects.enter()
		    .append("rect")
		    .attr("class", "schema");

		var cy = 0;
		rects.attr("id", function(d) { return getID(d); })
		    .attr("fill-opacity", ".5")
		    .attr("stroke-weight", "1")
		    .attr("stroke", "white")
		    .attr("width", 0)
			.attr("fill", function(d) {
		 	 	return schema.colorClass(d.class);
		    })
			.attr("height", function(d) {
				var percentHeight = (d.count / total) * height;
				d.cy = cy;
				cy += percentHeight;
				return percentHeight;
			})
			.attr("y", function(d) {
				return d.cy;
			});

		rects.on("mouseover", function(d) {
				self.mouseover(d);
			})
			.on("mouseout", function(d) {
				self.mouseout(d);
			});

		rects.transition()
			.duration(500)
			.attr("width", 20);

		rects.on("click", function(d) {
			console.log('clicked', d.name, d.id);
			self.getChildrenID(d.id);
			self.updateBounds(d);
		});

		// remove divs when they leave
		rects.exit().remove();
	};

	self.updateBounds = function(selected) {
		var bound = context.selectAll("rect.selection").data([selected]);

		bound.enter()
		    .append("rect")
		    .attr("class", "selection");

		bound.exit().remove();

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
		bound.attr("y", matchedPosition)
			.attr("height", matchedHeight)
			.attr("width", 20)
			.attr("stroke", "black")
			.attr("stroke-weight", 4)
			.attr("fill", "none");
	};

	self.reset = function() {
		self.getChildren("top-level class");
	};

	self.getChildren("top-level class");

	return self;
}();
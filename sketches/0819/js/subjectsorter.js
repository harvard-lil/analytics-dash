var lc = lc || {};

lc.subjectsorter = function() {
	var self = d3.dispatch("click", "mouseover", "mouseout", "selected"),

		// initial year, probably shouldn't be 5 :)
		year = 2,

		height = $("#nav").height(),

		// selected object
		graphSubjects = d3.select("#graph-subjects"),
		selected = null,
		selectedStripe = null,
		selectedStack = [],

		sidebar = d3.select("#nav");

	var selectedBorder = d3.select("#nav").append("svg:g")
		.attr("id", "selectionBorder");

	self.initialData = function(d) {
		self.data(d, sidebar);
		return self;
	};

	// set the data, and i is the index of the stripe to affect
	self.data = function(d, target) {
		target = target || graphSubjects;

		if (!d.length) {
			var data = [];

			for (var index in d) {
				var e = d[index];
				data.push(e);
			}

			update(data, target);
		} else {
			update(d, target);
		}

		return self;
	};

	self.year = function(y) {
		// if we call lc.stalactites.year() it will return the year
		if (!arguments.length)	return year;

		year = y;

		var total = 0;
		for (var i = 0; i < stripes.length; i++) {
			var stripe = stripes[i];
			var data = stripe.currentData;

			// ignore stripes without data
			if (!data || !data.length) continue;

			// calculate new total
			var len = data.length;
			var total = 0;
			for (var j = 0; j < len; j++) {
				var d = data[j];
				total += d.books[year];
			}

			// update the total? this changes the 'scale'
			update(stripe.currentData);
		}
	};

	self.clear = function() {
		selected = null;
		selectedStripe = null;

		self.data(schema.depth(0));

		return self;
	};

	// hidden function that updates the data which redraws the d3 navigator
	// data is an array that has a count variable
	function update(data, target) {
		target = target || graphSubjects;

		calculateSelectionStats(target, data);
		var total = target.currentTotal;
		var divs = target.selectAll("rect.schema")
			.data(data);

		updateDivsEnterExit(divs, target == graphSubjects ? 'graph' : 'sidebar');

		// start our cx at 0, this is in case we don't have a parent, we start stacking rects from the very left
		// lastParent is to check if we're switching parents [ie going from A to B, for example]
		// these two we keep track of as we iterate through the updated rects/
		var cy = 0;
		var lastParent = null;

		// update the fill based on the schema
		divs.attr("height", function(d) {
				// current number of books this year
				var num = d.books[year];

				// divided by the total number of books
				var percent = num / total;
				var percentHeight = (percent * height);

				d.cy = cy;
				cy += percentHeight;
			   	return percentHeight;
			})
			// this has to go after width because width calculates the cx's
			.attr("y", function(d) {
				return d.cy;
			});

		// now navigator takes care of its own navigation
		divs.on("click", function(d) {
			console.log(d);
			if (d.depth > 0) {
				if (d.count > 0) {
					self.data(d.sublevels);
					self.click(d);
				} else if (d.endblock == undefined) {
					var end = schema.makeEndData(d);
					self.data([end]);
					self.click([end]);
				}
			} else {
				self.data(d.sublevels);
				self.click(d);
			}
		});
	};

	function updateDivsEnterExit(divs, style) {
		// alter whether we're drawing onto the sidebar or behind the graph
		var width = style == 'sidebar' ? $("#nav").width() : $("#graph-subjects").width();

		// if we have new data, make new rects, call them .schema
		divs.enter()
		    .append("svg:rect")
		    .attr("class", "schema");

		divs.attr("id", function(d) { return getID(d); })
			.attr("fill", function(d) {
		 	 	return schema.color(d);
		    })
		    .attr("fill-opacity", ".5")
		    .attr("stroke-weight", "1")
		    .attr("stroke", "white");

			// update the opacity based on the number of circulations divided by the max circulations in that stripe
			// .attr("fill-opacity", function(d) {
			// 	if (!d.totalBooks || !d.totalCirc) return .01;

			// 	var opacity = ((d.totalCirc/d.totalBooks)/2);
			// 	return Math.max(.01, opacity);
			// });

		divs.on("mouseover", function(d) {
				self.mouseover(d);
			})
			.on("mouseout", function(d) {
				self.mouseout(d);
			})

		// make a transition for all the divs heights that lasts 1000 ms that goes to some pixel height
		divs.transition()
			.duration(500)
			.attr("width", width);

		// remove divs when they leave
		divs.exit().remove();
	}

	function calculateSelectionStats(stripe, data) {
		if (!stripe)	return;

		var total = 0;
		data.forEach(function(d) {
			total += d.books[year];
		});

		// store the data of this stripe
		stripe.max = d3.max(data, function(d) { return d.books[year]; });
		stripe.min = d3.min(data, function(d) { return d.books[year]; });
		stripe.circMax = d3.max(data, function(d) { return d.circs[year]; });
		stripe.currentData = data;
		stripe.currentTotal = total;
	}

	function getID(d) {
		var id = d.ClassLetters + d.ClassSubject.toLowerCase() + d.depth;
		return id.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
				    .replace(/\s+/g, '-') // collapse whitespace and replace by -
				    .replace(/-+/g, '-'); // collapse dashes
	}

	return self;
}();
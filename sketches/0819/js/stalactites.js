var lc = lc || {};

lc.stalactites = function() {
	var self = d3.dispatch("click", "mouseover", "mouseout"),

		// initial year, probably shouldn't be 5 :)
		year = 2,

		// width is the container width, so we can always refer to that
		width = $("#nav").height(),

		// store all the stripes [each depth layer]
		stripes = [],

		// initial scale
		scale = 1,

		// remember the scroll position
		currentScrollPercent = 0,

		// selected object
		selected = null,
		selectedStripe = null,
		selectedStack = [],

		highlightStripe = null;

	// create stripes to place divs in, max 8 for now
	for (var i = 0; i < 9; i++) {
		stripes[i] = d3.select("#nav").append("svg:g")
			.attr("id", "stripe" + i);

		stripes[i].scale = 1;
		stripes[i].offset = 0;
		stripes[i].depth = i;
		stripes[i].id = "#stripe" + i;
		// stripes[i].attr("transform", getTransform(stripes[i])+" rotate(90)");
		stripes[i].attr("transform", "translate(20,0) rotate(90)");
	}

	/* 
		make highlight stripe area 
	*/
	highlightStripe = d3.select("#nav").append("svg:g")
		.attr("id", "highlight-stripe");

	highlightStripe.scale = 1;
	highlightStripe.offset = 0;
	highlightStripe.depth = 0;
	highlightStripe.id = "#highlight-stripe";

	highlightStripe.attr("transform", getTransform(highlightStripe));

	var selectedBorder = d3.select("#nav").append("svg:g")
		.attr("id", "selectionBorder");
		// .attr("stroke", "black")
		// .attr("stroke-width", 1);

	// set the data, and i is the index of the stripe to affect
	self.data = function(d, i, parent) {
		for (var j = 0; j < 9; j++) {
			$("#stripe" + j).show();
		}
		$("#highlight-stripe").hide();

		var total = 0;

		if (!d.length) {
			var data = [];

			for (var index in d) {
				var e = d[index];
				data.push(e);
			}

			update(data, i, parent);
		} else {
			update(d, i, parent);	
		}

		return self;
	};

	self.year = function(y) {
		// if we call lc.stalactites.year() it will return the year
		if (!arguments.length)	return year;
		
		year = y;

		// for each stripe, update the totals and recalculate the widths for all of these
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
			update(stripe.currentData, stripe.depth, total, stripe.currentParent);
		}
	};

	// to get/set the scale
	self.scale = function(s) {
		// if we call lc.stalactites.scale() it will return the scale
		if (!arguments.length)	return scale;

		// clear animation if we have any
		if (scrollTimer) clearInterval(scrollTimer);

		scale = s;

		// set the new #nav width
	 	d3.select("#nav")
	 		.attr("width", width * scale);

	 	// update all the stripe's transformations
	 	// animate if possible
		for (var i = 0; i < 8; i++) {
			var stripe = stripes[i];

			stripe.scale = scale;

			stripe.attr("transform", getTransform(stripe));
		}

		selectedBorder.attr("transform", "scale(" + scale + ",1)");

		// if there's a selected rect, scroll to it
	 	if (selected && selectedStripe) {
	 		updateSelectedScroll(selectedStripe);
	 		updateSelectedStripeBorder(selectedStripe.currentData);
	 	} else {
	 		// clear selected stripe border
	 		updateSelectedStripeBorder();
	 	}

	 	// update the current pixel scrolled and animate towards centering it
		var currentScrollPixel = Math.round(currentScrollPercent * width * scale);
	 	$("#navContainer").scrollLeft(currentScrollPixel);
	 	updateContainerScroll();
	};

	self.clear = function() {
		selected = null;
		selectedStripe = null;

		self.data(schema.depth(1), 1);

		return self;
	};

	self.back = function() {

		for (var i = stripes.length - 1; i >= 0; i--) {
			var stripe = stripes[i];

			if (stripe.currentParent && stripe.currentParent.parent && i > 2) {
				var clicked = stripe.currentParent.parent;

				self.data(stripe.currentParent.parent.sublevels, i - 1, clicked);
				self.click(clicked);
				return i - 1;
			} else if (i == 1) {
				// deselect if we back up this far
				self.clear();
				return 0;
			}
		}
	};

	self.highlight = function(d) {
		/* old highlighting method */
		// clear the highlighted class if there are any
		// $(".highlighted").attr("class", "schema");

		// for (var i = 0; i < d.length; i++) {
		// 	var id = getID(d[i]);

		// 	var element = $("#" + id)[0];
		// 	if (element) {
		// 		element.setAttribute("class", "schema highlighted");
		// 	}
		// }

		for (var i = 0; i < 9; i++) {
			$("#stripe" + i).hide();
		}

		$("#highlight-stripe").show();
		self.highlightData(d);
	};

	/* 
		A whole different way to show schema blocks
		This is just to highlight everything on one stack

		And when blocks are clicked on, they traverse their own hierarchy
		And build it out with self.data() calls
		So its as if you traversed the whole hierarchy yourself
	*/
	self.highlightData = function(data) {
		// sort them alphabetically
		data.sort(function(a, b) {
			return a.ClassLetters.charCodeAt(0) - b.ClassLetters.charCodeAt(0);
		});

		var stripe = highlightStripe;
		calculateStripeStats(stripe, data);

		var total = stripe.currentTotal;
		var parentWidth = width;
		var cx = 0;

		// okay, now that we have the parentWidth [how big the new set of rects should be],
		// let's update the data and see what needs to change
		var divs = stripe.selectAll("rect.schema")
			.data(data);

		updateDivsEnterExit(divs);

		divs.attr("width", function(d) {
				// current number of books this year
				var num = d.books[year];

				// divided by the total number of books
				var percent = num / total;
				var percentWidth = (percent * parentWidth);

				d.cx = cx;
				cx += percentWidth;
			   	return percentWidth;
			})
			// this has to go after width because width calculates the cx's
			.attr("x", function(d) {
				return d.cx;
			});

		divs.on("click", function(d) {
			if (d.depth > 0) {
				var j = d.depth;

				// add all the parents of this object to a list
				var parent = d;
				var list = [];
				while (--j >= 0) {
					parent = parent.parent;
					list.push(parent);
				}

				// reverse the list so we're at the highest hierarchy first
				list.reverse();

				// add first layer
				self.data(schema.data, 0);

				// add the rest of the layers (except the last one, which is handled as usual)
				for (var i = 0; i < list.length; i++) {
					var layer = list[i];

					self.data(layer.sublevels, layer.depth + 1, layer);
				}

				// carry on as usual
				if (d.count > 0) {
					self.data(d.sublevels, d.depth + 1, d);	
					self.click(d);
				} else if (d.endblock == undefined) {
					var end = schema.makeEndData(d);
					self.data([end], end.depth, d);
					self.click([end]);
				}	
			} else {
				self.data(schema.data, d.depth);
				self.data(d.sublevels, d.depth + 1, d);	
				self.click(d);
			}
		});

		// clear the other rows
		clearRows();
	};

	// hidden function that updates the data which redraws the d3 navigator
	// data is an array that has a count variable
	function update(data, i, parent) {
		i = i || 0;

		var stripe = stripes[i];

		calculateStripeStats(stripe, data, parent);

		var total = stripe.currentTotal;

		// by default, the parent is the #nav width
		var navDiv = $("#nav");
		var parentWidth = width;

		// if this is depth 1 or greater, and we have a parent [ie something that was clicked on]
		// then we have a different parent width [not the full width] and we are scrolled
		// to focus on the parent rect
		if (i && parent) {
			// get the parent stripe
			var parentStripeID = "#stripe" + Math.max(0, (i - 1));

			// get the parent rect [what was clicked on]
			var parentDiv = $("#" + getID(parent));

			// update the selection
			selected = parentDiv;
			selectedStripe = stripe;

			updateSelectedStripeBorder(stripe.currentData);

			// update the parentWidth to the selection's width
			parentWidth = Math.round(selected.attr("width"));

			// figure out the currentScrollPercent
			updateSelectedScroll(stripe);

			// animate to center this
			updateContainerScroll();
		} else {
			updateSelectedStripeBorder();
		}

		// okay, now that we have the parentWidth [how big the new set of rects should be],
		// let's update the data and see what needs to change
		var divs = stripe.selectAll("rect.schema")
			.data(data);

		updateDivsEnterExit(divs);
		  
		// start our cx at 0, this is in case we don't have a parent, we start stacking rects from the very left
		// lastParent is to check if we're switching parents [ie going from A to B, for example]
		// these two we keep track of as we iterate through the updated rects/
		var cx = 0;
		var lastParent = null;

		// update the fill based on the schema
		divs.attr("width", function(d) {
				// current number of books this year
				var num = d.books[year];

				// divided by the total number of books
				var percent = num / total;
				var percentWidth = (percent * parentWidth);

				// if we have a parent, the percent is number of books that year divided by
				// the number of books that year in the parent
				if (d.parent && d.parent.books) {
					percent = num / d.parent.books[year];

					percentWidth = (percent * d.parent.divWidth);
				}
				
				// set the divWidth of our rect, so that the children of that rect know how big to be
				d.divWidth = percentWidth;

				// and if this parent isn't the same as the last one, update our cx
				// so we're always locked to the right widths and cx positions
				if (d.parent && d.parent != lastParent) {
					cx = d.parent.cx;
					lastParent = d.parent;
				}

				d.cx = cx;
				cx += percentWidth;
			   	return percentWidth;
			})
			// this has to go after width because width calculates the cx's
			.attr("x", function(d) {
				return d.cx;
			});

		// now navigator takes care of its own navigation
		divs.on("click", function(d) {
				if (d.depth > 0) {
					if (d.count > 0) {
						self.data(d.sublevels, d.depth + 1, d);	
						self.click(d);
					} else if (d.endblock == undefined) {
						var end = schema.makeEndData(d);
						self.data([end], end.depth, d);
						self.click([end]);
					}	
				} else {
					self.data(d.sublevels, d.depth + 1, d);	
					self.click(d);
				}
			});

		cullRows(i);
	};

	function updateDivsEnterExit(divs) {
		// if we have new data, make new rects, call them .schema
		divs.enter()
		    .append("svg:rect")
		    .attr("class", "schema");

		divs.attr("fill", function(d) {
		 	 	return schema.color(d);
		    })
			// assign the id
			.attr("id", function(d) { return getID(d); })

			// update the opacity based on the number of circulations divided by the max circulations in that stripe
			.attr("fill-opacity", function(d) {
				if (!d.totalBooks || !d.totalCirc) return .01;

				var opacity = ((d.totalCirc/d.totalBooks)/2);
				return Math.max(.01, opacity);
			});

		divs.on("mouseover", function(d) {
				self.mouseover(d);
			})
			.on("mouseout", function(d) {
				self.mouseout(d);
			})

		// make a transition for all the divs heights that lasts 1000 ms that goes to some pixel height
		divs.transition()
			.duration(500)
			.attr("height", 16);

		// remove divs when they leave
		divs.exit().remove();
	}

	function updateSelectedStripeBorder(data) {

		if (!data) {
			selectedBorder.selectAll("path.vert").data([]).exit().remove();
			selectedBorder.selectAll("path.horz").data([]).exit().remove();
			return;
		}

		var vpts = [];
		var hpts = [];

		var d = data[0];
		var depth = d.depth;
		var stripe = $("#stripe" + depth);
		var navpos = $("#nav").offset();

		var cx = d.parent.cx;

		var top = (18 * d.depth);
		var bot = (18 * (d.depth + 1));

		var totalWidth = 0;
		for (var i = 0; i < data.length; i++) {
			var current = data[i];
			var num = current.books[year];
			var percent = num / current.parent.books[year];
			var percentWidth = (percent * current.parent.divWidth);
			totalWidth += percentWidth;
		}

		vpts.push([[cx, top], [cx, bot]]);
		vpts.push([[cx + totalWidth, top], [cx + totalWidth, bot]]);

		hpts.push([[cx, bot], [cx + totalWidth, bot]]);
		hpts.push([[cx, top], [cx + totalWidth, top]]);

		if (d.endblock) {
			var offset = 3;

			// can add more here to make the line thicker, like a +3 etc. 
			// this is a dumb way to do it, but works for now
			hpts.push([[cx, bot + offset + 1], [cx + totalWidth, bot + offset + 1]]);
			hpts.push([[cx, bot + offset + 2], [cx + totalWidth, bot + offset + 2]]);
		}

		var verts = selectedBorder.selectAll("path.vert").data(vpts);

		verts.enter()
			.append("svg:path")
			.attr("class", "vert")
			.attr("stroke", "black")
			.attr("fill", "none");

		verts
			.attr("stroke-width", 1 / (scale * 2))
			.attr("d", function(d) { return 'M' + d.join('L'); });

		verts.exit().remove();

		var horzs = selectedBorder.selectAll("path.horz").data(hpts);

		horzs.enter()
			.append("svg:path")
			.attr("class", "horz")
			.attr("stroke", "black")
			.attr("fill", "none");

		horzs
			.attr("stroke-width", 1)
			.attr("d", function(d) { return 'M' + d.join('L'); });

		horzs.exit().remove();
	}

	function updateSelectedBorder(parent) {

		selectedStack = [];
		var getSelectedStack = function(parent) {
			selectedStack.unshift(parent);
			if (parent.parent)
				getSelectedStack(parent.parent);
		}
		getSelectedStack(parent);

		var lpts = [];
		var rpts = [];
		for (var i = 0; i < selectedStack.length; i++) {
			var box = $("#" + getID(selectedStack[i])),
				nav = $("#nav"),
				pos = box.offset(),
				navpos = nav.offset(),
				left = (pos.left - navpos.left),
				right = (pos.left - navpos.left) + (box.attr("width") * scale),
				top = (pos.top - navpos.top);

			lpts.push([left / scale, top]);
			lpts.push([left / scale, top + 18]);
			rpts.push([right / scale, top]);
			rpts.push([right / scale, top + 18]);
		}

		rpts.reverse();

		var both = lpts.concat(rpts);
		var path = selectedBorder.selectAll("path").data([both]);

		path.enter()
			.append("svg:path")
			.attr("stroke", "black")
			.attr("fill", "none");

		// need to break these up in to different paths, alter the stroke based on scale
		path
			.attr("d", 'M' + lpts.join('L') + 'L' + rpts.join('L'));

		path.exit().remove();
	}


	function updateSelectedScroll(stripe) {
		// figure out the width of the selected rect
		var parentWidth = Math.round(selected.attr("width"));

		// figure out the offset it is from the left side of the page
		var pageOffset = (selected.offset().left - $("#nav").offset().left);

		// then update the stripe width to the new parent's width
		$(stripe.id)
			.attr("width", parentWidth)
			.attr("transform", getTransform(stripe));

		// center on the current selected thingy
		var centered = pageOffset - (width * .5) + (parentWidth * scale * .5);

		// store a percentage
		currentScrollPercent = centered / $("#nav").width();
	}

	// animate to center the navContainer around the currentScrollPercent
	var scrollTimer = 0;
	function updateContainerScroll() {
		if (scrollTimer) clearInterval(scrollTimer);

		var i = 0;
		// scrollTimer = setInterval(function() {
			// figure out where the scroll percent is in pixel space
		 	var currentScrollPixel = Math.round(currentScrollPercent * width * scale);

		 	// get the current scroll
		 	var cs = $("#navContainer").scrollLeft();

		 	// update it
		 	cs += (currentScrollPixel - cs) * .25;

			// if (++i > 40 || isNaN(currentScrollPercent)) {
			// 	clearInterval(scrollTimer);
			// 	return;
			// }

			// set it
 		 	$("#navContainer").scrollLeft(cs);

		// }, 40);
	}

	function cullRows(i) {
		// copy this index
		var j = i;

		// we select the previous stripes (those below i)
		// set their heights to 100px with a 1000ms transition
		while (i > 0) {
			i--;
			var stripe = stripes[i].selectAll("rect.schema");
			stripe
				.transition()
				.duration(1000)	
				.attr("height", 16);
		}

		// select the next stripes (those greater than j)
		// transition those stripes to height 0 with a 1000ms transition
		while (j < stripes.length-1) {
			j++;
			var nextStripe = stripes[j].selectAll("rect.schema");

			nextStripe
				.transition()
				.duration(1000)
				.attr("height", 0);

			nextStripe.html("");
			stripes[j].currentParent = null;
		}
	};

	function clearRows() {
		for (var i = 0; i < stripes.length; i++) {
			var stripe = stripes[i].selectAll("rect.schema");

			stripe
				.transition()
				.duration(1000)
				.attr("height", 0);

			stripe.html("");
			stripes[i].currentParent = null;
		}
	}

	function calculateStripeStats(stripe, data, parent) {
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
		stripe.currentParent = parent;
	}

	function getID(d) {
		var id = d.ClassLetters + d.ClassSubject.toLowerCase() + d.depth;
		return id.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
				    .replace(/\s+/g, '-') // collapse whitespace and replace by -
				    .replace(/-+/g, '-'); // collapse dashes
	}

	function getTransform(stripe) {
		var scaleString = "scale(" + stripe.scale + ",1)";
		var translateString = " translate(" + stripe.offset + "," + (stripe.depth * 18) + ")";

		return scaleString + translateString;
	}
	
	return self;	
}();
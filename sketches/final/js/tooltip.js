var lc = lc || {};

lc.tooltip = function() {
	var self = d3.dispatch("click", "mouseover", "mouseout", "search"),
		tooltip = $("#tooltip");

	self.initialize = function() {
		$("#graph").mousemove(function(e) {
			tooltip.css({
				top: e.offsetY,
				left: e.offsetX + 10
			});
		});
	};

	var commas = function(x) {
	    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}

	self.show = function(row) {
		// if (row.className) {
		// 	tooltip.html( row.ClassLetters + ' ' + row.ClassNumBegin + '-'+row.ClassNumEnd+': ' + row.ClassSubject);
		// } else if (row.class) {
		// 	tooltip.html(row.name + ': ' + commas(row.start) + '-' + commas(row.end));
		// } else if (row.creator) {
		// 	tooltip.html(row.title + ': ' + commas(row.loc_call_num_sort_order[0]));
		// } else {
		// 	tooltip.html(row)
		// }
		tooltip.html(row.title);

		tooltip.show();
	};

	self.hide = function() {
		tooltip.hide();
	}

	return self;
}();
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
		 if (row.class) {
		 	tooltip.html(row.lastname);
		  } else if (row.creator) {
		 	tooltip.html(row.title);
		 } else {
		 //	tooltip.html(row)
		 }
	//	tooltip.html(row.title + ' - ' + row.loc_call_num_subject.split("--")[0]);

		tooltip.show();
	};

	self.hide = function() {
		tooltip.hide();
	}

	return self;
}();
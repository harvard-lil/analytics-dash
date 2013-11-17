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
		console.log(row)
		 if (row.class) {
		 	tooltip.html(row.lastname + ': ' + row.start+ ' - ' +row.end );
		  } else if (row.creator) {
		 	tooltip.html(row.title+ ': ' + String(row.loc_call_num_sort_order[0]).replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1,") + " " + row.call_num[0]);
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
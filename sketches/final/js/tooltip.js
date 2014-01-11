var lc = lc || {};

lc.tooltip = function() {
	var self = d3.dispatch("click", "mouseover", "mouseout", "search"),
		tooltip = $("#tooltip");

	self.initialize = function() {
		$("#graph").mousemove(function(e) {
			tooltip.css({
				top: e.offsetY + 10,
				left: e.offsetX + 110
			});
		});
	};

	self.show = function(row) { 
		tooltip.html(row.title);
		tooltip.show();
	};

	self.hide = function() {
		tooltip.hide();
	}

	return self;
}();
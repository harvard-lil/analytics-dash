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

	self.show = function(item) { 
		var c = item.call_num ? lcObjectArray[item.call_num[0].substr(0,1)].color : "#666";
		tooltip.html(item.title).css("border-top","5px solid "+c);
		tooltip.show();
	};

	self.hide = function() {
		tooltip.hide();
	}

	return self;
}();
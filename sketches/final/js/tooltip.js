var lc = lc || {};

lc.tooltip = function() {
	var self = d3.dispatch("click", "mouseover", "mouseout", "search"),
		tooltip = $("#tooltip");

	self.initialize = function() {
		$("#graph-wrapper").mousemove(function(e) {
			tooltip.css({
				top: e.offsetY,
				left: e.offsetX + 50
			});
		});
	};

	self.show = function(row) {
		if (row.className) {
			tooltip.html( row.ClassLetters + ' ' + row.ClassNumBegin + '-'+row.ClassNumEnd+': ' + row.ClassSubject);
		} else if (row.class) {
			tooltip.html(row.name + ' ' + row.start + '-' + row.end);
		} else {
			tooltip.html(row)
		}

		tooltip.show();
	};

	self.hide = function() {
		tooltip.hide();
	}

	return self;
}();
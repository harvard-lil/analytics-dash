var lc = lc || {};

lc.tooltip = function() {
	var self = d3.dispatch("click", "mouseover", "mouseout", "search"),
		tooltip = $("#tooltip");

	$("#graph").mousemove(function(e) {
		tooltip.css({
			top: e.offsetY,
			left: e.pageX
		});
	});

	self.show = function(row) {
		if (row.className) {
			tooltip.html( row.ClassLetters + ' ' + row.ClassNumBegin + '-'+row.ClassNumEnd+': ' + row.ClassSubject);

		//	ClassNumBegin: d.ClassNumBegin,
		//	ClassNumEnd: d.ClassNumEnd,
		//	ClassNumDiff: d.ClassNumDiff,


		} else {
			tooltip.html(row);
		}

		tooltip.show();
	};

	self.hide = function() {
		tooltip.hide();
	}

	return self;
}();
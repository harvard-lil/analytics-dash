var lc = lc || {};

lc.tooltip = function() {
	var self = d3.dispatch("click", "mouseover", "mouseout", "search"),
		hover = $("#tooltip"),
		hoverTitle = $("#currentSelection");

	$(document).mousemove(function(e) {
		hover.css({
			top: e.pageY,
			left: e.pageX
		});
	});

	self.show = function(row) {
		if (row.className) {
			hoverTitle.html( row.ClassLetters + ' ' + row.ClassNumBegin + '-'+row.ClassNumEnd+': ' + row.ClassSubject);

		//	ClassNumBegin: d.ClassNumBegin,
		//	ClassNumEnd: d.ClassNumEnd,
		//	ClassNumDiff: d.ClassNumDiff,


		} else {
			hoverTitle.html(row);
		}

		hover.show();
	};

	self.hide = function() {
		hover.hide();
	}

	return self;
}();
var lc = lc || {};

lc.histogram = function() {

    var gHeight = 50;
    var histoGroup = d3.select("#histogram").select("svg").attr("width","100%").attr("height",gHeight).append("g");
    var gWidth = $("#histogram").width();
    var booksByYear;

    self.appendHistogram = function(data) {

        booksByYear = d3.nest().key(function(d){
            if (d["pub_date_numeric"])
                return d["pub_date_numeric"];
        }).entries(data).sort(function(a,b){
            return a.key - b.key;
        });

        var minYear = parseInt(d3.min(booksByYear,function(d){ return d.key; })),
            maxYear = parseInt(d3.max(booksByYear,function(d){ if (d.key != "undefined") return d.key; })),
            maxBooks = d3.max(booksByYear,function(d){ return d.values.length; });

        var yearScale = d3.scale.linear().domain([minYear,maxYear]).range([0,gWidth-(gWidth/(maxYear-minYear))]),
            bookScale = d3.scale.linear().domain([0,maxBooks]).range([3,gHeight]);

        var bars = histoGroup.selectAll("rect").data(booksByYear);

        bars.enter().append("rect");
        bars.exit().remove();

        bars.attr("fill","#808080")
            .attr("width",function(){
                return gWidth/(maxYear-minYear);
            }).attr("height",function(d){
                return bookScale(d.values.length);
            }).attr("y",function(d){
                return gHeight - bookScale(d.values.length);
            }).attr("x",function(d){
                if (d.key != "undefined")
                    return yearScale(d.key);
            }).attr("opacity",function(d){
                if (d.key == "undefined")
                    return 0;
            });

        $("#slider-range").slider({
            range: true,
            min: minYear,
            max: maxYear,
            values: [ minYear, maxYear ],
            slide: function( event, ui ) {
                $(".ui-slider-handle:first").text(ui.values[0]);
                $(".ui-slider-handle:last").text(ui.values[1]);
                histoGroup.selectAll("rect").attr("fill",function(d){
                    if ((d.key >= ui.values[0]) && (d.key <= ui.values[1]))
                        return "#808080";
                    else
                        return "#ddd";
                });
                lc.graph.updateDateRange(ui.values[0],ui.values[1]);
            }
        });
        $(".ui-slider-handle:first").text(minYear);
        $(".ui-slider-handle:last").text(maxYear);
    };

    self.getBooksByYear = function() {
        return booksByYear;
    };

    return self;
}();
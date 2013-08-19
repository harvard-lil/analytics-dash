var lc = lc || {};

lc.histogram = function() {

    var histoGroup = d3.select("#histogram").append("svg").attr("width","100%").attr("height","100%").append("g");

    self.appendHistogram = function(data) {

        var booksByYear = d3.nest().key(function(d){
            return d["pub_date_numeric"];
        }).entries(data).sort(function(a,b){
            return a.key - b.key;
        });

        var minYear = parseInt(booksByYear[0].key),
            maxYear = parseInt(booksByYear[booksByYear.length-1].key),
            maxBooks = d3.max(booksByYear,function(d){ return d.values.length; });

        var yearScale = d3.scale.linear().domain([minYear,maxYear]).range([0,590]),
            bookScale = d3.scale.linear().domain([0,maxBooks]).range([0,100]);

        var bars = histoGroup.selectAll("rect").data(booksByYear);

        bars.enter().append("rect");
        bars.exit().remove();

        bars.attr("fill","yellow")
            .attr("width",function(){
                return 600/(maxYear-minYear);
            }).attr("height",function(d){
                return bookScale(d.values.length);
            }).attr("y",function(d){
                return 100 - bookScale(d.values.length);
            }).attr("x",function(d){
                return yearScale(d.key);
            });

        $("#slider-range").slider({
            range: true,
            min: minYear,
            max: maxYear,
            values: [ minYear, maxYear ],
            slide: function( event, ui ) {
                $("#amount").text( ui.values[0]+" - "+ui.values[1] );
                histoGroup.selectAll("rect").attr("fill",function(d){
                    if ((d.key >= ui.values[0]) && (d.key <= ui.values[1]))
                        return "yellow";
                    else
                        return "none";
                });
            }
            });
        $("#amount").text($("#slider-range").slider("values",0)+" - "+$("#slider-range").slider("values",1));
    };

    return self;
}();
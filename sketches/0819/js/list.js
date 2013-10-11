var lc = lc || {};

lc.list = function() {

    var documents;
    var listWrapper = d3.select("#list-wrapper"),
        graphWrapper = d3.select("#graph-wrapper"),
        list = d3.select("#list");

    $("#show-list").click(function(){
        self.showList();
    });

    self.saveDocs = function(docs) {
        documents = docs;
    };

    self.showList = function() {

        listWrapper.style("display","block");
        graphWrapper.style("display","none");

        var items = list.selectAll("li").data(documents);
        var entering = items.enter().append("li");
        entering.append("p").attr("class","title");

        items.exit().remove();

        items.select("p")
            .text(function(d){
                return d.title + ", " + d.pub_date_numeric;
            }).style("border-bottom-color", function(d){
                if (d.call_num){
                    return lcObjectArray[d.call_num[0].substr(0,1)].color;
                }
            }).on("click",function(d){
                lc.carrel.sendToCarrel(d);
            });
        items.on("mouseover",function(d){
            lc.graph.showInfo(d);
        });
    };

    self.hideList = function() {
        listWrapper.style("display","none");
        graphWrapper.style("display","block");
    };

    $("#list-sort-by li").click(function(){
        self.sortList($(this).attr("class"));
    });

    self.sortList = function(sorter) {
        list.selectAll("li").sort(function(a,b){
            return d3.ascending(a[sorter], b[sorter]);
        });
    };

    return self;
}();
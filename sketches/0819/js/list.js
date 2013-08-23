var lc = lc || {};

lc.list = function() {

    var documents;
    var listWrapper = d3.select("#list-wrapper")
        list = d3.select("#list");

    $("#show-list").click(function(){
        self.showList();
    });

    self.saveDocs = function(docs) {
        documents = docs;
    };

    self.showList = function() {
        listWrapper.style("display","block");

        var items = list.selectAll("li").data(documents);
        var entering = items.enter().append("li");
        entering.append("h2").attr("class","title");
        entering.append("a");
        entering.append("p");

        items.exit().remove();

        items.select("h2")
            .text(function(d){
                return d.title;
            }).style("border-bottom-color", function(d){
                if (d.call_num){
                    return lcObjectArray[d.call_num[0].substr(0,1)].color;
                }
            });
        items.select("a").text("Add To Carrel")
            .on("click",function(d){
                lc.carrel.sendToCarrel(d);
            });
        items.select("p")
            .text(function(d){
                if (d.loc_call_num_subject)
                    return d.loc_call_num_subject;
            });
        items.on("mouseover",function(d){
            lc.graph.showInfo(d);
        });
    };

    self.hideList = function() {
        listWrapper.style("display","none");
    };

    $("#list-sort-by li").click(function(){
        self.sortList($(this).attr("class"));
    });

    self.sortList = function(sorter) {
        console.log(sorter)
        list.selectAll("li").sort(function(a,b){
            // console.log(a[sorter] - b[sorter])
            return d3.ascending(a[sorter], b[sorter]);
        });
    };

    return self;
}();
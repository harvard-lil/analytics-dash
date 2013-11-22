var lc = lc || {};

lc.carrel = function() {

    var carrel = [],
        carrelBox = d3.select("#carrel-box ul");

    $("#export-carrel").click(function(){
        exportCarrel();
    });
    $("#table-carrel").click(function(){
        tableCarrel();
    });
    
    self.sendToCarrel = function(bookData) {
        carrel.push(bookData);
        updateCarrelBoxes();
    };

    self.removeFromCarrel = function(bookData) {
        var index = carrel.indexOf(bookData);
        carrel.splice(index,1);
        updateCarrelBoxes();
    }
    var carrelHeight = $("#carrel-box").height()-15;
    var widthScale = d3.scale.linear().domain([0,600]).range([5,30]);
    var heightScale = d3.scale.linear().domain([0,14]).range([carrelHeight-30,carrelHeight]);

    function updateCarrelBoxes() {
        var carrelBoxes = carrelBox.selectAll("li").data(carrel);
        carrelBoxes.enter().append("li")
            .on("click",function(d){
                lc.graph.showInfo(d, false);
            })//.append("span");
        carrelBoxes.exit().remove();

        carrelBoxes.style("background-color",function(d){
            if (d.call_num){
                return lcObjectArray[d.call_num[0].substr(0,1)].color;
            } else {
                return "black";
            }
        }).style("width",function(d){
            if (d.pages_numeric)
                return widthScale(d.pages_numeric) + "px";
            else
                return "15px";
        }).style("height",function(d){
            if (d.height) {
                var m = d.height.split(" ");
                if (m[m.length-1] == "cm")
                    d.bookHeight = Math.max(carrelHeight-30,heightScale(parseFloat(m[0])/2.5));
                else
                    d.bookHeight = Math.max(carrelHeight-30,heightScale(parseFloat(m[0])));
            } else {
                d.bookHeight = carrelHeight-30;
            }

            return Math.min(carrelHeight,d.bookHeight) + "px";
        }).style("margin-top",function(d){
            return (carrelHeight - d.bookHeight) + "px";
        });
        // .select("span").text(function(d){
        //     return d.title;
        // }).style("margin-top",function(d){
        //     var w = $(this).parent().width();
        //     return (d.bookHeight - 20) + "px";
        // });
    }
    var headings = ["title", "creator", "publisher", "call_num", "holding_libs", "lcsh", "id_isbn", "pub_date", "pub_location", "shelfrank", "language", "id_oclc", "note", "format"];
    var displayHeadings = ["title", "creator", "publisher", "call number", "holding Libraries", "LCSH", "ISBN ID", "date of publication", "publishing location", "shelfrank", "language", "OCLC ID", "note", "format"];

    self.exportCarrel = function() {
        self.exportAll(carrel);
    };
    self.exportAll = function(data) {
        var strData = headings.join(",");

        data.forEach(function(item,i){
            var book = [];
            headings.forEach(function(d){
                var t = item[d];
                if (t instanceof Array) {
                    t = t.join("; ");
                }
                t = String(t).replace(/,/g, '.');
                book.push(t);
            });
            book.join("\t")
            strData = strData.concat("\n"+book);
            
        });

        download(strData, "dowload.csv", "text/csv");
    };

    function tableCarrel() {
        // var headings = ["title", "creator", "publisher", "call_num", "holding_libs", "lcsh", "score_holding_libs", "id_isbn", "id",  "title_sort", "score_checkouts_undergrad", "height", "title_link_friendly", "score_checkouts_grad", "pub_date", "loc_call_num_subject", "pub_location", "ut_id", "pages", "loc_call_num_sort_order", "score_checkouts_fac", "data_source", "dataset_tag", "score_recalls", "shelfrank",  "language", "id_inst", "ut_count", "id_oclc", "note", "format",  "pub_date_numeric", "source_record"];

        var csv = displayHeadings.join("~~~");

        carrel.forEach(function(item,i){
            var book = "|||";
            headings.forEach(function(d){
                var t = item[d];
                if (t instanceof Array) {
                    t = t.join("%%%");
                } 
                book = book.concat(t+"~~~");
            });
            csv = csv.concat(book);
        });
        window.open("table.html#"+csv)
    }

    /*
        outline of how to download csv, it will auto-download in chrome, firefox, and IE
        for safari, it will open in a new tab and users will have to save as .csv
        to do: actually get the correct data showing up in the csv, parse out the objects into strings
    */
    function download(strData, strFileName, strMimeType) {
        var D = document,
            A = arguments,
            a = D.createElement("a"),
            d = A[0],
            n = A[1],
            t = A[2] || "text/plain";

        //build download link:
        a.href = "data:" + strMimeType + "," + escape(strData);

        if (window.MSBlobBuilder) { // IE10
            var bb = new MSBlobBuilder();
            bb.append(strData);
            return navigator.msSaveBlob(bb, strFileName);

        } else if ('download' in a) { //FF20, CH19
            a.setAttribute("download", n);
            a.innerHTML = "downloading...";
            D.body.appendChild(a);
            setTimeout(function() {
                var e = D.createEvent("MouseEvents");
                e.initMouseEvent("click", true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
                a.dispatchEvent(e);
                D.body.removeChild(a);
            }, 66);
            var f = D.createElement("iframe");
            D.body.appendChild(f);
            f.src = "data:" + (A[2] ? A[2] : "application/octet-stream") + (window.btoa ? ";base64" : "") + "," + (window.btoa ? window.btoa : escape)(strData);
            setTimeout(function() {
                D.body.removeChild(f);
            }, 333);

        } else { //safari
            var csvContent = "data:text/csv;charset=utf-8,";
            csvContent = csvContent.concat(strData);
            // strData.forEach(function(item, i){
            //    var dataString = item.join(",");
            //    csvContent += (i < carrel.length) ? dataString+ "\n" : dataString;
            // });
            var encodedUri = encodeURI(csvContent);
            window.open(encodedUri);
        }
    }

    return self;
}();
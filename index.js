const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;

// tao may chu
app.listen(PORT,function () {
    console.log("server is running...");
})

app.use(express.static("public"));
app.set("view engine","ejs");

// tao cau hinh ket noi Sql server
const mssql = require("mssql");
const config = {
    server: '101.99.13.2',
    user:'sa',
    password:'z@GH7ytQ',
    database:'test'
}
// connect db
mssql.connect(config,function (err) {
    if(err) console.log(err);
    else console.log("ket noi DB thanh cong!");
})
// tao doi tuong truy van
const db = new mssql.Request();

app.get("/",function (req,res) {
    let sql_text = "SELECT * FROM DanhMuc;SELECT * FROM ThuongHieu;SELECT TOP 12 * FROM SanPham ORDER BY ID DESC;"
    db.query(sql_text,function (err,rows) {
        if(err) res.send(err);
        else res.render("home",{
            danhmucs: rows.recordsets[0],
            thuonghieus: rows.recordsets[1],
            sanphams: rows.recordsets[2],
        });
    })
   // res.render("home");
})

app.get("/danh-muc/:id",async function (req,res) {
    const DanhMucID = req.params.id;
    const sql_text = "SELECT * FROM DanhMuc;SELECT * FROM ThuongHieu; " +
        "SELECT * FROM SanPham WHERE DanhMucID = "+DanhMucID;
    let data = {
        danhmucs: [],
        thuonghieus: [],
        sanphams: [],
        danhMucHienTai: {}
    }
    await db.query(sql_text).then(rows=>{
        const danhmucs = rows.recordsets[0];
        for(let d of danhmucs){
            if(d.ID == DanhMucID){
                data.danhMucHienTai = d;
                break;
            }
        }
        data.danhmucs = danhmucs;
        data.thuonghieus = rows.recordsets[1];
        data.sanphams =  rows.recordsets[2];
    }).catch(err=>{

    })
    res.render("danhmuc",data);
})

app.get("/san-pham/:id",async function (req,res) {
    let SanPhamID= req.params.id;
    const sql_text = "SELECT * FROM DanhMuc;SELECT * FROM ThuongHieu; " +
        "SELECT * FROM SanPham WHERE ID="+SanPhamID+"; SELECT * FROM DanhGiaSanPham WHERE SanPhamID="+SanPhamID;
    let data = {
        danhmucs: [],
        thuonghieus: [],
        sanpham: {},
        danhgias:[]
    }
    try {
        const rows = await db.query(sql_text);
        data.danhmucs = rows.recordsets[0];
        data.thuonghieus = rows.recordsets[1];
        data.sanpham = rows.recordsets[2].length>0?rows.recordsets[2][0]:{};
        data.danhgias = rows.recordsets[3];
    }catch (e) {

    }
    res.render("sanpham",data);
})
// dung body parser
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended:true}));

app.post("/luu-danh-gia",async function (req,res) {
    const tenKH = req.body.TenNguoi;
    const DT = req.body.DienThoai;
    const SS = req.body.SoSao;
    const NX = req.body.NhanXet;
    const SPID = req.body.SanPhamID;
    const sql_text = "INSERT INTO DanhGiaSanPham(TenNguoi,DienThoai,SoSao,NhanXet,SanPhamID)" +
        ` VALUES(N'${tenKH}','${DT}',${SS},N'${NX}',${SPID});`;
    try {
        await db.query(sql_text);
    }catch (e) {
    }
    res.redirect(`/san-pham/${SPID}`);
})

app.get("/tim-kiem",async function (req,res) {
    let keyword = req.query.search;
    let page = req.query.page !== undefined?req.query.page:1;
    const limit = 6;
    let sql_text = "SELECT * FROM DanhMuc;SELECT * FROM ThuongHieu;" +
        `SELECT a.* FROM SanPham as a ` +
        "LEFT JOIN DanhMuc as b ON b.ID = a.DanhMucID " +
        "LEFT JOIN ThuongHieu as c ON c.ID = a.ThuongHieuID " +
        `WHERE a.TenSP LIKE N'%${keyword}%' `+
        `OR b.TenDanhMuc LIKE N'%${keyword}%' `+
        `OR c.TenThuongHieu LIKE N'%${keyword}%' `+
        `ORDER BY a.ID DESC OFFSET ${(page-1)*limit} ROWS FETCH FIRST ${limit} ROWS ONLY;`+
        `SELECT count(a.ID) as total FROM SanPham as a ` +
        "LEFT JOIN DanhMuc as b ON b.ID = a.DanhMucID " +
        "LEFT JOIN ThuongHieu as c ON c.ID = a.ThuongHieuID " +
        `WHERE a.TenSP LIKE N'%${keyword}%' `+
        `OR b.TenDanhMuc LIKE N'%${keyword}%' `+
        `OR c.TenThuongHieu LIKE N'%${keyword}%';`;
    let data = {
        danhmucs: [],
        thuonghieus: [],
        sanphams: [],
        page:parseInt(page),
        keyword:keyword,
        total:0,
        pageNumber:1
    }
    try{
        const rows = await db.query(sql_text);
        data.danhmucs = rows.recordsets[0];
        data.thuonghieus = rows.recordsets[1];
        data.sanphams = rows.recordsets[2];
        data.total =  rows.recordsets[3][0].total;
        data.pageNumber = Math.ceil(data.total/limit);
    }catch (e) {
        //console.log(e.message);
    }
   res.render("search",data);
})
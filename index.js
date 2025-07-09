const express = require("express");
const session = require("express-session");
const passport = require("passport");
const SamlStrategy = require("passport-saml").Strategy;
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

// Session để giữ trạng thái đăng nhập
app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Thông tin cấu hình SAML từ Azure AD
const samlStrategy = new SamlStrategy(
  {
    entryPoint:
      "https://login.microsoftonline.com/a765af6d-0095-412a-a88c-580aa7f94cad/saml2", // URL SSO của Azure AD
    issuer: "https://samlappkientvt15-hoangnv34.msappproxy.net/", // Entity ID bạn đặt trong Azure
    callbackUrl: "https://927b241e4873.ngrok-free.app/login/callback", // ACS URL
    cert: `-----BEGIN CERTIFICATE-----
MIIC8DCCAdigAwIBAgIQeK8DBSKspblOpGmeUUBxOzANBgkqhkiG9w0BAQsFADA0MTIwMAYDVQQD
EylNaWNyb3NvZnQgQXp1cmUgRmVkZXJhdGVkIFNTTyBDZXJ0aWZpY2F0ZTAeFw0yNTA2MjMwMjA4
MDVaFw0yODA2MjMwMjA4MDRaMDQxMjAwBgNVBAMTKU1pY3Jvc29mdCBBenVyZSBGZWRlcmF0ZWQg
U1NPIENlcnRpZmljYXRlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAn8aZqIAgZPrK
hNHqQ7RMH4QK9ridjlSLnu/Iin2esDqpXbtFu2sNayv/Cs9YVZ1GmF0R0hP8pnZguXZwvlA8JxWW
LsOP0hlV8H24uNpDydgSPyTLYOUWDFdtdXd7Mmyk+KWZ/m5ivM7kMjaxAxAU+4QJuDALY71zK51A
wWkprZeehRkaGvLVlsMnSgJy2k/S2nH7k7UCgTqXVHwo69/p0l5ZTOiH2S+KdA+6PAFfTgKxBuFa
FjQE0yD9g/u7hmBTQ59WNBUHwYAYfYnqWbums8alT5OZ4XqMEbFc1EmGoERcCToR00V+huY8LQAl
urEqi+cILPmRiSs3OcPQ5lXsHQIDAQABMA0GCSqGSIb3DQEBCwUAA4IBAQBiv92ZxQJzatzoCnWl
bvmiX+ZvAjVeOiCc3fDJIJj53AVy+LGHdI6qSc2zyAGtvb9xDesfo2YshIcg52Lx0BlIv/XhH+US
dzOOXfjEtZeWmge+d+TG1izInjZl1eM6nylGfmMb+NrCXx4F8EaONffGx0UpWDeOu9tZcc0m6V7n
PfJ25n2LLd9oJFcjNf0oVniuCefuMz/K506Yq+0Jifw2uIDALhIAqSa3vlML0zepc+qPB98LWY3t
i/F8/zfNStywDYHt4kxJVOENrDiXSw1SMDf1vHR+3x1wKYLgxzn0z4snz9rfBUGX1fkaArWYzf6p
Ig3ybK71Hyw6jgUOQ+PL
-----END CERTIFICATE-----`,
  },
  (profile, done) => {
    // profile chứa thông tin user từ Azure AD
    return done(null, profile);
  }
);

passport.use(samlStrategy);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Route để bắt đầu đăng nhập
app.get(
  "/login",
  passport.authenticate("saml", { failureRedirect: "/", failureFlash: true }),
  (req, res) => {
    res.redirect("/");
  }
);

app.get("/.well-known/apple-app-site-association", (req, res) => {
  const json = fs.readFileSync(
    path.join(__dirname, "public", ".well-known", "apple-app-site-association")
  );
  res.setHeader("Content-Type", "application/json");
  res.send(json);
});

// Callback route sau khi login thành công Azure AD
app.post(
  "/login/callback",
  passport.authenticate("saml", { failureRedirect: "/", failureFlash: true }),
  (req, res) => {
    console.log("saml response");
    res.redirect("https://927b241e4873.ngrok-free.app?token=1234");
    // res.redirect("/protected");
  }
);

// Middleware kiểm tra auth
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).send("Unauthorized");
}

// API protected
app.get("/protected", ensureAuthenticated, (req, res) => {
  res.json({
    message: "Bạn đã đăng nhập thành công!",
    user: req.user,
  });
});

// Trang chủ
app.get("/", (req, res) => {
  res.send(`
    <h1>Welcome</h1>
    <a href="/login">Đăng nhập bằng Azure AD</a>
  `);
});

app.listen(3000, () => {
  console.log("Server chạy ở http://localhost:3000");
});

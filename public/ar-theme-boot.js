(function () {
  try {
    var t = localStorage.getItem("ar-theme");
    if (t === "light") document.documentElement.classList.remove("dark");
    else document.documentElement.classList.add("dark");
  } catch {
    document.documentElement.classList.add("dark");
  }
})();

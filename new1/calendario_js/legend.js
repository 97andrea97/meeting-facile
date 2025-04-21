
function showLegend(userList) {
    const legendContainer = document.getElementById("user-legend");
    if (!legendContainer) return;
    legendContainer.innerHTML = "<h3>Legenda utenti</h3>";
    userList.forEach(user => {
      const color = getUserColor(user);
      const div = document.createElement("div");
      div.style.marginBottom = "5px";
      div.innerHTML = `<span style="display:inline-block;width:12px;height:12px;background:${color};margin-right:8px;border-radius:2px"></span> ${user}`;
      legendContainer.appendChild(div);
    });
  }
  
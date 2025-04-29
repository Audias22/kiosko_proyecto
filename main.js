let carrito = [];

const verCarritoBtn = document.getElementById('verCarrito');
const canastaFija = document.getElementById('canastaFija');
const listaCarrito = document.getElementById('listaCarrito');
const totalSpan = document.getElementById('total');
const ventasLista = document.getElementById('ventasDia');

// Mostrar productos por categoría
async function mostrarCategoria(categoria) {
  const contenedor = document.getElementById('contenedor-productos');
  contenedor.innerHTML = '<p>Cargando productos...</p>';

  try {
    const querySnapshot = await db.collection("kioskos")
      .where("categoria", "==", categoria)
      .get();

    let html = '';
    querySnapshot.forEach(doc => {
      const producto = doc.data();
      producto.id = doc.id;

      if (producto.stock <= 0) {
        html += `
          <div class="producto agotado">
            <img src="${producto.imagen}" alt="${producto.nombre}">
            <h3>${producto.nombre}</h3>
            <p><strong>ID:</strong> ${producto.id}</p>
            <p><strong>Stock:</strong> 0</p>
            <p class="agotado-texto">AGOTADO</p>
          </div>
        `;
      } else {
        html += `
          <div class="producto">
            <img src="${producto.imagen}" alt="${producto.nombre}">
            <h3>${producto.nombre}</h3>
            <p><strong>ID:</strong> ${producto.id}</p>
            <p><strong>Stock:</strong> ${producto.stock}</p>
            <p>Precio: Q${producto.precio}</p>
            <button class="boton-agregar" onclick='agregarAlCarrito(${JSON.stringify(producto)})'>➕ Agregar</button>
          </div>
        `;
      }
    });

    contenedor.innerHTML = html || "<p>No hay productos disponibles.</p>";
  } catch (error) {
    console.error("Error al cargar productos: ", error);
    contenedor.innerHTML = "<p>Error al cargar productos.</p>";
  }
}

// Agregar producto al carrito (solo valida, no descuenta)
async function agregarAlCarrito(producto) {
  const docRef = db.collection("kioskos").doc(producto.id);
  const doc = await docRef.get();
  const datos = doc.data();

  const index = carrito.findIndex(p => p.id === producto.id);
  const cantidadEnCarrito = index >= 0 ? carrito[index].cantidad : 0;

  if ((cantidadEnCarrito + 1) > datos.stock) {
    alert(`❌ No hay suficiente stock para "${producto.nombre}". Stock actual: ${datos.stock}`);
    return;
  }

  if (index >= 0) {
    carrito[index].cantidad += 1;
  } else {
    producto.cantidad = 1;
    carrito.push(producto);
  }

  actualizarCarrito();
  actualizarContadorCarrito();
}

// Mostrar/ocultar carrito
verCarritoBtn.addEventListener('click', () => {
  canastaFija.classList.toggle('oculto');
  if (!canastaFija.classList.contains('oculto')) {
    actualizarCarrito();
  }
});

// Actualizar carrito
function actualizarCarrito() {
  listaCarrito.innerHTML = '';
  let total = 0;

  carrito.forEach((prod, i) => {
    const subtotal = prod.precio * prod.cantidad;
    total += subtotal;

    const item = document.createElement('li');
    item.innerHTML = `
      ${prod.nombre} - Q${prod.precio} x 
      <input type="number" min="1" value="${prod.cantidad}" onchange="cambiarCantidad(${i}, this.value)">
      = Q${subtotal}
      <button onclick="eliminarDelCarrito(${i})">🗑</button>
    `;
    listaCarrito.appendChild(item);
  });

  totalSpan.textContent = `Total: Q${total.toFixed(2)}`;
  actualizarContadorCarrito();
}

// Cambiar cantidad
function cambiarCantidad(index, nuevaCantidad) {
  const cantidad = parseInt(nuevaCantidad);
  if (cantidad > 0) {
    carrito[index].cantidad = cantidad;
    actualizarCarrito();
  }
}

// Eliminar producto del carrito
function eliminarDelCarrito(index) {
  carrito.splice(index, 1);
  actualizarCarrito();
  actualizarContadorCarrito();
}

// Contador carrito
function actualizarContadorCarrito() {
  const contador = carrito.reduce((acc, p) => acc + p.cantidad, 0);
  const contadorSpan = document.getElementById('contadorCarrito');
  if (contadorSpan) {
    contadorSpan.textContent = contador;
  }
}

// Finalizar compra y descontar stock en Firebase
async function finalizarCompra() {
  if (carrito.length === 0) {
    alert("🛒 La canasta está vacía.");
    return;
  }

  let erroresStock = [];

  for (let item of carrito) {
    const docRef = db.collection("kioskos").doc(item.id);
    const doc = await docRef.get();
    const data = doc.data();

    if (item.cantidad > data.stock) {
      erroresStock.push(`❌ ${item.nombre} — stock disponible: ${data.stock}, solicitado: ${item.cantidad}`);
    }
  }

  if (erroresStock.length > 0) {
    alert("🚫 No se puede finalizar la compra:\n" + erroresStock.join('\n'));
    return;
  }

  for (let item of carrito) {
    const docRef = db.collection("kioskos").doc(item.id);
    const doc = await docRef.get();
    const data = doc.data();

    await docRef.update({
      stock: data.stock - item.cantidad
    });
  }

  const total = carrito.reduce((sum, p) => sum + p.precio * p.cantidad, 0);
  const venta = {
    productos: carrito,
    total: total,
    fecha: new Date()
  };

  db.collection("ventas").add(venta)
    .then(() => {
      alert("✅ Compra registrada correctamente.");
      carrito = [];
      actualizarCarrito();
      actualizarContadorCarrito();
    })
    .catch(error => {
      console.error("Error al guardar venta: ", error);
      alert("❌ Error al guardar la venta.");
    });
}

// Mostrar historial de ventas filtrado
function mostrarHistorial() {
  const filtro = parseInt(document.getElementById('filtroHistorial').value);
  const hoy = new Date();
  const fechaInicio = new Date(hoy.setDate(hoy.getDate() - filtro));
  const tabla = document.getElementById("tablaHistorial");
  const cierreCaja = document.getElementById("cierreCaja");

  db.collection("ventas")
    .where("fecha", ">=", fechaInicio)
    .get()
    .then(snapshot => {
      tabla.innerHTML = "";
      let total = 0;

      snapshot.forEach(doc => {
        const venta = doc.data();
        venta.productos.forEach(p => {
          total += p.precio * p.cantidad;
          tabla.innerHTML += `
            <tr>
              <td>${new Date(venta.fecha.toDate()).toLocaleString()}</td>
              <td>${p.nombre}</td>
              <td>${p.cantidad}</td>
              <td>Q${p.precio * p.cantidad}</td>
            </tr>`;
        });
      });

      cierreCaja.textContent = `Q${total.toFixed(2)}`;
    });
}

// Exportar a Excel con filtro
function exportarVentas(dias) {
  const hoy = new Date();
  const fechaInicio = new Date(hoy.setDate(hoy.getDate() - dias));
  const datos = [];

  db.collection("ventas")
    .where("fecha", ">=", fechaInicio)
    .get()
    .then(snapshot => {
      let total = 0;

      snapshot.forEach(doc => {
        const venta = doc.data();
        venta.productos.forEach(p => {
          total += p.precio * p.cantidad;
          datos.push({
            Fecha: new Date(venta.fecha.toDate()).toLocaleString(),
            Producto: p.nombre,
            Cantidad: p.cantidad,
            Subtotal: p.precio * p.cantidad
          });
        });
      });

      datos.push({ Producto: "Cierre de Caja", Subtotal: total });

      const wb = XLSX.utils.book_new();
      const hoja = XLSX.utils.json_to_sheet(datos);
      XLSX.utils.book_append_sheet(wb, hoja, `Ventas_${dias}dias`);
      XLSX.writeFile(wb, `Ventas_${dias}dias.xlsx`);
    });
}

// Al cargar la página
window.addEventListener("load", () => {
  mostrarHistorial();
});

// Administrador: actualizar stock
async function actualizarStockProducto() {
  const id = document.getElementById("productoStock").value.trim();
  const nuevo = parseInt(document.getElementById("nuevoStock").value.trim());
  const resultado = document.getElementById("resultadoStock");

  if (!id || isNaN(nuevo) || nuevo < 0) {
    resultado.textContent = "⚠️ Ingresa un ID de producto y un stock válido.";
    resultado.style.color = "orange";
    return;
  }

  try {
    const docRef = db.collection("kioskos").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      resultado.textContent = `❌ No existe el producto con ID: ${id}`;
      resultado.style.color = "red";
      return;
    }

    await docRef.update({ stock: nuevo });
    resultado.textContent = `✅ Stock actualizado para '${id}' a ${nuevo} unidades.`;
    resultado.style.color = "green";
  } catch (err) {
    console.error("Error actualizando stock:", err);
    resultado.textContent = "❌ Ocurrió un error actualizando el stock.";
    resultado.style.color = "red";
  }
}

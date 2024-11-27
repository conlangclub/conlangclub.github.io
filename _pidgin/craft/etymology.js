---
---
const CANVAS = document.getElementById('graph');

async function init() {
  let data = await (await fetch( "{{'/assets/pidgincraft-data/etymology-graph.json' | absolute_url}}" )).json();

  forceGraph(data);
  window.addEventListener('resize', e => {
    forceGraph(data);
  });
}

function forceGraph(data) {
  CANVAS.width = CANVAS.clientWidth;
  CANVAS.height = CANVAS.clientHeight;

  const width = CANVAS.width;
  const height = CANVAS.height;

  const w2 = width / 2,
        h2 = height / 2,
        nodeRadius = 5;

  const ctx = CANVAS.getContext('2d');
  const canvas = CANVAS;

  const simulation = forceSimulation(width, height);
  let transform = d3.zoomIdentity;

  // The simulation will alter the input data objects so make
  // copies to protect the originals.
  const nodes = data.nodes.map(d => Object.assign({}, d));
  const edges = data.links.map(d => Object.assign({}, d));

  d3.select(canvas)
    .call(d3.drag()
          // Must set this in order to drag nodes. New in v5?
          .container(canvas)
          .subject(dragSubject)
          .on('start', dragStarted)
          .on('drag', dragged)
          .on('end', dragEnded))
    .call(d3.zoom()
          .scaleExtent([1 / 10, 8])
          .on('zoom', zoomed));

  simulation.nodes(nodes)
    .on("tick",simulationUpdate);
  simulation.force("link")
    .links(edges);

  function zoomed() {
    transform = d3.event.transform;
    simulationUpdate();
  }
  
  /** Find the node that was clicked, if any, and return it. */
  function dragSubject() {
    const x = transform.invertX(d3.event.x),
          y = transform.invertY(d3.event.y);
    const node = findNode(nodes, x, y, nodeRadius);
    if (node) {
      node.x =  transform.applyX(node.x);
      node.y = transform.applyY(node.y);
    }
    // else: No node selected, drag container
    return node;
  }

  function dragStarted() {
    if (!d3.event.active) {
      simulation.alphaTarget(0.3).restart();
    }
    d3.event.subject.fx = transform.invertX(d3.event.x);
    d3.event.subject.fy = transform.invertY(d3.event.y);
  }

  function dragged() {
    d3.event.subject.fx = transform.invertX(d3.event.x);
    d3.event.subject.fy = transform.invertY(d3.event.y);
  }

  function dragEnded() {
    if (!d3.event.active) {
      simulation.alphaTarget(0);
    }
    d3.event.subject.fx = null;
    d3.event.subject.fy = null;
  }

  function simulationUpdate() {
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);
    // Draw edges
    edges.forEach(function(d) {
      ctx.beginPath();
      ctx.moveTo(d.source.x, d.source.y);
      ctx.lineTo(d.target.x, d.target.y);
      ctx.lineWidth = Math.sqrt(d.value);
      ctx.strokeStyle = '#aaa';
      ctx.stroke();
    });
    // Draw nodes
    nodes.forEach(function(d, i) {
      ctx.beginPath();
      // Node fill
      ctx.moveTo(d.x + nodeRadius, d.y);
      ctx.arc(d.x, d.y, nodeRadius, 0, 2 * Math.PI);
      ctx.fillStyle = 'blue';
      ctx.fill();
      // Node outline
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = '1.5'
      ctx.stroke();
      // Node label
      ctx.fillText(d.id, d.x + 5, d.y)
    });
    ctx.restore();
  }

  return canvas;
}

function findNode(nodes, x, y, radius) {
  const rSq = radius * radius;
  let i;
  for (i = nodes.length - 1; i >= 0; --i) {
    const node = nodes[i],
          dx = x - node.x,
          dy = y - node.y,
          distSq = (dx * dx) + (dy * dy);
    if (distSq < rSq) {
      return node;
    }
  }
  // No node selected
  return undefined; 
}

function forceSimulation(width, height) {
  return d3.forceSimulation()
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("charge", d3.forceManyBody().strength(-20))
    .force("link", d3.forceLink().id(d => d.id))
    .force("positionX", d3.forceX(width/2).strength(.03))
    .force("positionY", d3.forceY(height/2).strength(.03));
}

init();
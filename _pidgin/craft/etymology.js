const SPRITE_SHEET_URL = "https://conlang.club/pidgincraft-etymology-graph/spritesheet.png";

const canvas = document.getElementById('graph');

async function init() {
  const data = await (await fetch( "https://conlang.club/pidgincraft-etymology-graph/graph.json" )).json();

  // Wait for sprite sheet to be fetched
  const spriteSheet = await (new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.src = SPRITE_SHEET_URL;
  }));

  // Determine sessions where words were added
  const sessions = getSessions(data.nodes);
  populateMaxSessionInput(sessions);

  // Make the D3 graph
  let simulation = forceGraph(data, spriteSheet);
  window.addEventListener('resize', e => {
    simulation.stop();
    simulation = forceGraph(data, spriteSheet);
  });
  document.getElementById('max-session').addEventListener('change', e => {
    simulation.stop();
    simulation = forceGraph(data, spriteSheet);
  })
  
}

/**
 * 
 * @param {Date[]} sessions Array of session dates
 */
function populateMaxSessionInput(sessions) {
  const input = document.getElementById('max-session');
  input.min = sessions[0].getTime();
  input.max = sessions[sessions.length-1].getTime();
  input.value = input.max;

  const sessionDatalist = document.getElementById('sessions');
  for (let session of sessions) {
    const option = document.createElement('option');
    option.value = session.getTime();
    sessionDatalist.append(option);
  }
}

/**
 * Get the dates of each session where a word was attested.
 * @param {Object[]} words List of words with a sessionDocumented attribute.
 * @returns {Date[]} Array of session dates
 */
function getSessions(words) {
  let sessions = new Set();
  words.forEach(w => sessions.add(w.sessionDocumented));

  return Array.from(sessions)
    .sort()
    .map(session => new Date(session))
    .filter(date => !Number.isNaN(date.valueOf()));
}

/**
 * Get the value of the max-session input selector as an ISO date string (not datetime)
 * @returns YYYY-MM-DD ISO date string
 */
function getISODateOfMaxSession() {
  const maxSessionValue = document.getElementById('max-session').value;
  const maxSessionDate = new Date(Number.parseInt(maxSessionValue))
  return maxSessionDate.toISOString().substring(0, 10);
}

/**
 * Filter nodes and edges to include only words created before the date of the
 * max-session selector.
 * @param {Object} data Pidgin etymology graph object (contains `nodes` and `links`)
 * @returns Nodes and edges for D3
 */
function filterByMaxSession(data) {
  const maxSession = getISODateOfMaxSession();
  const wordSet = new Set();

  nodes = data.nodes.filter(word => word.sessionDocumented <= maxSession);
  nodes.forEach(word => wordSet.add(word.id));

  edges = data.links.filter(edge => (
    (wordSet.has(edge.source) && wordSet.has(edge.target)) ||
    (wordSet.has(edge.source.id) && wordSet.has(edge.target.id)))
  );

  return [nodes, edges];
}

/**
 * Create and run a D3 force simulation of the given graph
 * @param {Object} data Pidgin etymology graph object (contains `nodes` and `links`)
 * @param {Image} spriteSheet Sprite sheet for nodes with an icon index
 * @returns {Object} D3 force simulation object
 */
function forceGraph(data, spriteSheet) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  const width = canvas.width;
  const height = canvas.height;

  const w2 = width / 2,
        h2 = height / 2,
        nodeRadius = 5;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const simulation = forceSimulation(width, height);
  let transform = d3.zoomIdentity;

  const [nodes, edges] = filterByMaxSession(data);

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
          .on('zoom', zoomed))
    .on('mousemove', showTooltip);

  function showTooltip() {
    // const hoveredNode = dragSubject();
    const x = transform.invertX(d3.event.x);
    const y = transform.invertY(d3.event.y);
    const hoveredNode = findNode(nodes, x, y, nodeRadius);

    const tooltip = document.getElementById('tooltip');
  
    if (hoveredNode === undefined) {
      tooltip.style.display = 'none';
      return;
    }
  
    tooltip.style.display = 'block';
    tooltip.style.left = d3.event.x + 10 + 'px';
    tooltip.style.top = d3.event.y + 10 + 'px';
  
    document.getElementById('tooltip-word').textContent = hoveredNode.id;

    document.getElementById('tooltip-session-documented').textContent = hoveredNode.sessionDocumented || '';
    if (hoveredNode.etymologicalRoots?.length > 0) {
      document.getElementById('tooltip-etymological-roots').textContent = hoveredNode.etymologicalRoots.join(', ');
    } else {
      document.getElementById('tooltip-etymological-roots').textContent = '-';
    }
    document.getElementById('tooltip-def').textContent = hoveredNode.def || '?';
  }

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
      ctx.strokeStyle = '#00000077';
      ctx.lineWidth = 1.5;
      drawArrow(
        ctx,
        d.source.x,
        d.source.y,
        d.target.x,
        d.target.y,
        d.source.icon ? 24 : 12,
        d.target.icon ? 24 : 12
      );
      ctx.stroke();
    });

    // Draw nodes
    nodes.forEach(function(d, i) {
      ctx.beginPath();
      // Node fill
      ctx.moveTo(d.x + nodeRadius, d.y);
      if (d.icon === undefined) {
        ctx.arc(d.x, d.y, nodeRadius, 0, 2 * Math.PI);
      } else {
        ctx.drawImage(
          spriteSheet,
          d.icon * 32, 0,
          32, 32,
          d.x - 16, d.y - 16,
          32, 32
        );
      }
      ctx.fillStyle = colorNode(d);
      ctx.fill();

      // Node outline
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = '1.5'
      ctx.stroke();

      // Node label
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'white';
      ctx.fillStyle = 'black';
      if (d.icon) {
        ctx.strokeText(d.id, d.x, d.y + 24);
        ctx.fillText(d.id, d.x, d.y + 24);
      } else {
        ctx.strokeText(d.id, d.x, d.y + 16);
        ctx.fillText(d.id, d.x, d.y + 16);
      }
    });
    ctx.restore();
  }

  return simulation;
}

function drawArrow(ctx, fromX, fromY, toX, toY, fromMargin, toMargin) {
  var headlen = 10; // length of head in pixels
  var dx = toX - fromX;
  var dy = toY - fromY;
  var angle = Math.atan2(dy, dx);

  toX -= toMargin*Math.cos(angle);
  toY -= toMargin*Math.sin(angle);

  fromX += fromMargin*Math.cos(angle)
  fromY += fromMargin*Math.sin(angle)

  ctx.lineCap = 'round';
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(toX, toY);
  ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
}

function findNode(nodes, x, y, radius) {
  const rSq = 16 * 16;
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

function colorNode(d) {
  if (d.def === '?') return 'gray';

  return 'blue';
}

function forceSimulation(width, height) {
  return d3.forceSimulation()
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("charge", d3.forceManyBody().strength(-80))
    .force("link", d3.forceLink().id(d => d.id).strength(.2))
    .force("positionX", d3.forceX(width/2).strength(.02))
    .force("positionY", d3.forceY(height/2).strength(.02))
    .force("collide", d3.forceCollide(d => 32));
}

init();
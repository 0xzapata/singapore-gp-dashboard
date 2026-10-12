import * as THREE from 'three';

export function createTrack(curve) {
  const group = new THREE.Group();group.name = 'track-details';
  const count = 1600, halfWidth = .28;
  const samples = curve.getSpacedPoints(count);
  const normals = samples.map((point, i) => {
    const before = samples[(i + count - 1) % count], after = samples[(i + 1) % count];
    return new THREE.Vector3(-(after.z - before.z), 0, after.x - before.x).normalize();
  });
  function ribbon(path, left, right, y, color, name) {
    const positions = [], indices = [], colors = [];
    path.forEach((point, i) => {
      const normal = path === samples ? normals[i] : new THREE.Vector3(-(path[Math.min(i+1,path.length-1)].z-path[Math.max(i-1,0)].z),0,path[Math.min(i+1,path.length-1)].x-path[Math.max(i-1,0)].x).normalize();
      for (const side of [left,right]) positions.push(point.x+normal.x*side, y, point.z+normal.z*side);
      if (i < path.length-1) indices.push(i*2,i*2+1,i*2+2,i*2+1,i*2+3,i*2+2);
      if (Array.isArray(color)) { const c = new THREE.Color(color[Math.floor(i/2)%color.length]);colors.push(c.r,c.g,c.b,c.r,c.g,c.b); }
    });
    const geo = new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);
    if(colors.length) geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    const mesh = new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:colors.length?'#ffffff':color,vertexColors:!!colors.length,side:THREE.DoubleSide}));mesh.name=name;group.add(mesh);
    return mesh;
  }
  ribbon(samples,-halfWidth,halfWidth,.04,'#293039','asphalt');
  ribbon(samples,-halfWidth-.025,-halfWidth,.052,'#b6c4c8','left-edge');
  ribbon(samples,halfWidth,halfWidth+.025,.052,'#b6c4c8','right-edge');
  const barrierPositions = [], barrierColors = [], posts = [], lamps = [];
  const segment = (a,b,color='#627987') => {
    barrierPositions.push(...a,...b);const c=new THREE.Color(color);barrierColors.push(c.r,c.g,c.b,c.r,c.g,c.b);
  };
  const kerbPositions = [], kerbColors = [];
  for (let i=0;i<count;i++) {
    const p=samples[i],q=samples[i+1],n=normals[i],m=normals[i+1];
    const bending=normals[(i+8)%count].dot(normals[(i+count-8)%count]) < .98;
    for(const side of [-1,1]) {
      const rail=side*(halfWidth+.11);
      if(i%2===0) for(const y of [.10,.24]) segment([p.x+n.x*rail,y,p.z+n.z*rail],[q.x+m.x*rail,y,q.z+m.z*rail]);
      if(i%12===0) posts.push({position:new THREE.Vector3(p.x+n.x*rail,.12,p.z+n.z*rail),scale:[.025,.24,.025]});
      if(bending) {
        const inside=side*(halfWidth+.026),outside=side*(halfWidth+.10);
        const a=[p.x+n.x*inside,.058,p.z+n.z*inside],b=[p.x+n.x*outside,.058,p.z+n.z*outside];
        const c=[q.x+m.x*inside,.058,q.z+m.z*inside],d=[q.x+m.x*outside,.058,q.z+m.z*outside];
        kerbPositions.push(...a,...b,...c,...b,...d,...c);
        const color=new THREE.Color(Math.floor(i/3)%2 ? '#d0d9d8' : '#a6634e');
        for(let k=0;k<6;k++) kerbColors.push(color.r,color.g,color.b);
      }
    }
    if(i%65===0) {
      const side=i%130?1:-1,x=p.x+n.x*side*.64,z=p.z+n.z*side*.64;
      segment([x,.03,z],[x,1.35,z]);segment([x,1.35,z],[x-n.x*side*.32,1.35,z-n.z*side*.32]);
      lamps.push({position:new THREE.Vector3(x-n.x*side*.32,1.34,z-n.z*side*.32),scale:[.13,.04,.20]});
    }
  }
  const rails=new THREE.BufferGeometry();rails.setAttribute('position',new THREE.Float32BufferAttribute(barrierPositions,3));rails.setAttribute('color',new THREE.Float32BufferAttribute(barrierColors,3));
  const railMesh=new THREE.LineSegments(rails,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.65}));railMesh.name='barriers-and-floodlights';group.add(railMesh);
  const kerbs=new THREE.BufferGeometry();kerbs.setAttribute('position',new THREE.Float32BufferAttribute(kerbPositions,3));kerbs.setAttribute('color',new THREE.Float32BufferAttribute(kerbColors,3));
  const kerbMesh=new THREE.Mesh(kerbs,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}));kerbMesh.name='striped-corner-kerbs';group.add(kerbMesh);

  function boxes(items,color,name) {
    const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color}),items.length),matrix=new THREE.Matrix4();
    items.forEach((box,i)=>{matrix.makeScale(...box.scale);matrix.setPosition(box.position);mesh.setMatrixAt(i,matrix);});mesh.name=name;group.add(mesh);return mesh;
  }
  boxes(posts,'#6b818a','barrier-posts');boxes(lamps,'#f2d3aa','floodlight-heads');

  const pointAt=(f,offset=0)=>{
    const p=curve.getPointAt((f+1)%1),t=curve.getTangentAt((f+1)%1);
    return p.add(new THREE.Vector3(-t.z,0,t.x).normalize().multiplyScalar(offset));
  };
  const pitPath=Array.from({length:140},(_,i)=>{
    const f=.957+i/139*.13,blend=Math.sin(i/139*Math.PI);
    return pointAt(f,.83*Math.min(1,blend*3));
  });
  ribbon(pitPath,-.11,.11,.045,'#323d46','pit-lane');
  const pitLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pitPath.map(p=>new THREE.Vector3(p.x,.065,p.z))),new THREE.LineDashedMaterial({color:'#8ca7a5',dashSize:.18,gapSize:.12,transparent:true,opacity:.7}));pitLine.computeLineDistances();group.add(pitLine);
  const pitBoxes=[];
  for(let i=0;i<12;i++) {
    const p=pointAt(.973+i*.0046,1.22);p.y=.19;pitBoxes.push({position:p,scale:[.44,.38,.33]});
  }
  boxes(pitBoxes,'#53616a','pit-garages');
  const checkerPositions=[],checkerColors=[];
  const start=curve.getPointAt(0),tangent=curve.getTangentAt(0),normal=new THREE.Vector3(-tangent.z,0,tangent.x).normalize();
  for(let row=0;row<3;row++) for(let column=0;column<8;column++) {
    const vertices=[];
    for(const [a,b] of [[0,0],[1,0],[0,1],[1,0],[1,1],[0,1]]) {
      const across=-halfWidth+(column+a)*halfWidth*2/8,along=(row+b)*.052;
      vertices.push(start.x+normal.x*across+tangent.x*along,.069,start.z+normal.z*across+tangent.z*along);
    }
    checkerPositions.push(...vertices);const c=new THREE.Color((row+column)%2?'#c4ccca':'#11161b');
    for(let j=0;j<6;j++)checkerColors.push(c.r,c.g,c.b);
  }
  const checkerGeo=new THREE.BufferGeometry();checkerGeo.setAttribute('position',new THREE.Float32BufferAttribute(checkerPositions,3));checkerGeo.setAttribute('color',new THREE.Float32BufferAttribute(checkerColors,3));
  group.add(new THREE.Mesh(checkerGeo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide})));

  const gridLines=[];
  for(let i=0;i<16;i++) {
    const f=.992-i*.0035,p=pointAt(f,i%2?.12:-.12),t=curve.getTangentAt(f),n=new THREE.Vector3(-t.z,0,t.x);
    const corner=(along,across)=>[p.x+t.x*along+n.x*across,.067,p.z+t.z*along+n.z*across];
    gridLines.push(...corner(-.13,-.065),...corner(.13,-.065),...corner(.13,-.065),...corner(.13,.065),...corner(.13,.065),...corner(-.13,.065));
  }
  group.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(gridLines,3)),new THREE.LineBasicMaterial({color:'#b6c4c8',transparent:true,opacity:.8})));
  const grandstands=[];
  for(const f of [.014,.26,.48,.88]) for(let row=0;row<5;row++) {
    const p=pointAt(f,-1.2-row*.1);p.y=.12+row*.10;grandstands.push({position:p,scale:[1.7,.07,.12]});
  }
  boxes(grandstands,'#6a7b86','grandstand-seating');
  return {group,pitLabel:pointAt(.015,1.35)};
}

const fetchInfo = async () => {
    const q = "Apple Inc";
    const res = await fetch(`https://vi.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&utf8=&format=json&origin=*`);
    const data = await res.json();
    console.log(data);
}
fetchInfo();

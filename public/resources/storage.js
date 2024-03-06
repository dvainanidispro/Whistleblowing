const storage = firebase.storage();
let caseStorage = storage.ref(App.getParams.caseid);

document.addEventListener('DOMContentLoaded', async function(){
    let files = await caseStorage.listAll();
    files.items.forEach(async function(item){
        let url = await item.getDownloadURL();
        let li = document.createElement('li');
        li.innerHTML = `<a href="${url}" target="_blank">${item.name}</a>`;
        Q('#filelist').appendChild(li);
    });
});
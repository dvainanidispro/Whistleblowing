const storage = firebase.storage();

document.addEventListener('DOMContentLoaded', async function(){
    let companyID = localStorage.getItem('companyID') ?? await App.user.claims('companyID');    //sometimes it is not set yet
    let caseStorage = storage.ref(companyID + '/' + App.getParams.caseid);
    let files = await caseStorage.listAll();
    files.items.forEach(async function(item){
        let url = await item.getDownloadURL();
        let li = document.createElement('li');
        li.innerHTML = `<a href="${url}" target="_blank">${item.name}</a>`;
        Q('#filelist').appendChild(li);
    });
});
const storage = firebase.storage();

let fetchCaseFiles = async () => {
        let companyID = localStorage.getItem('companyID') ?? await App.user.claims('companyID');    //sometimes it is not set yet
        let caseStorage = storage.ref(companyID + '/' + App.getParams.caseid);
        let files = await caseStorage.listAll();
        // console.debug(files.items);
        // in case error
        files.items.forEach(async function(item){
            try{    // to try πρέπει να μπει εδώ, όχι στη "μαμά" function
                let url = await item.getDownloadURL();
                let a = document.createElement('a');
                a.href = url;
                a.target = '_blank';
                a.textContent = item.name;
                a.classList.add(...['list-group-item','list-group-item-action','list-group-item-light']);
                Q('#filelist').appendChild(a);      //TOFIX: κάποιες φορές βγάζει σφάλμα (λόγω του alpine template x-if="caseLoaded")
            } catch(e) {
                console.error(e);
            }
        });
};

// document.addEventListener('DOMContentLoaded', async function(){
//     firebase.auth().onAuthStateChanged(fetchFiles);
// });


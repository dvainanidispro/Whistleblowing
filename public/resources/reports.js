/* Construct all items of the cases array into a proper format */
const casesForReport = cases => {
    let properCases = cases.map(caseDoc=>{
        return {
            id: caseDoc.id,
            sumbittedAt: caseDoc.submittedAt.toDate().toISOString().split('T')[0],
            type: DB.status[caseDoc.status].type,
            date: caseDoc.date,
            status: DB.status[caseDoc.status].text,
            title: caseDoc.title,
            people: caseDoc.people,
            description: DB.status[caseDoc.status].description,
            numberOfMessages: caseDoc.messages.length,
            numberOfFiles: caseDoc.filenames.length,
            submitter: (caseDoc.submitter.firstname??'') + " " + (caseDoc.submitter.lastname??''),
            submitterEmail: caseDoc.submitter.email ?? '',
            submitterPhone: caseDoc.submitter.phone ?? '',
            submitterNotify: caseDoc.submitter.notify ?? '',
        }
    })
    console.table(properCases);
    return properCases;
};


document.getElementById('downloadExcel').addEventListener('click', function () {
    if (!Array.isArray(window.reportCases) || window.reportCases.length === 0) {
      alert('Δεν υπάρχουν διαθέσιμες υποθέσεις.');
      return;
    }

    const ws = XLSX.utils.json_to_sheet(window.reportCases);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cases');

    XLSX.writeFile(wb, 'Cases.xlsx');
});


App.whistleToHTMLTable = (whistle) => {
    let table = '<table class="table"><tr><th>Key</th><th>Value</th></tr>';
    for (let key in whistle) {
      if (whistle.hasOwnProperty(key)) {
        let value = whistle[key];
        // Check if the value is an array or an object
        if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        table += `<tr><td>${key}</td><td>${value}</td></tr>`;
      }
    }
    table += '</table>';
    return table;
};


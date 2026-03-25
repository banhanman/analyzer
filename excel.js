const Excel = {

    load(file, callback) {

        const reader = new FileReader();

        reader.onload = function(e) {

            const data = new Uint8Array(e.target.result);

            const workbook = XLSX.read(data, { type: 'array' });

            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            const json = XLSX.utils.sheet_to_json(sheet);

            console.log("EXCEL PARSED:", json);

            callback(json);
        };

        reader.readAsArrayBuffer(file);
    }

};
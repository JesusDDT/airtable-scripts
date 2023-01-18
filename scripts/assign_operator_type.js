//Load Initial Data
let table = base.getTable("Event Schedule");
let view = table.getView("1.2 - Auto: Assign Operator Type");
let query = await view.selectRecordsAsync();

//Create quota & current schedule for TaskUs
const quotas = {
  "Sunday": 10,
}

function isAssignedToTaskUs(record) {
  return record.getCellValueAsString("Operator Type").includes("TU");
}

function getQuota(dayOfWeek) {
  return quotas[dayOfWeek]
}

function getAssigned(date, recordsAssignedToTaskUs) {
  return recordsAssignedToTaskUs.records.filter(r => r.getCellValueAsString("Date") == date).length
}

function getNextDay(date) {
  return new Date(new Date(date).setDate(date.getDate() + 1));
}


async function createQuota() {
  let taskUsView = table.getView("All TaskUs Assignments");
  let recordsAssignedToTaskUs = await taskUsView.selectRecordsAsync();

  //Get Days
  var date = new Date();
  var loop_count = 99;
  var days = [date];
  var next_day;
  var loop_index;

  for (loop_index = 1; loop_index <= loop_count; loop_index++) {
    next_day = getNextDay(next_day || date);
    days.push(next_day);
  }

  var relevantDays = []
  days.filter((day) => day.getDay() == 0).map((day) => {
    var date = day.toLocaleDateString("en-us", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).split("/").join("-");
    var dayOfWeek = day.toLocaleDateString("en-us", {
      weekday: "long"
    })

    var quota = getQuota(dayOfWeek)
    var assigned = getAssigned(date, recordsAssignedToTaskUs);

    relevantDays.push({
      date: date,
      dayOfWeek: dayOfWeek,
      quota: quota,
      assigned: assigned,
      has_capacity: quota > assigned
    })
  });

  return relevantDays;
}



//Analyze records in view
for (let record of query.records) {


  //If Strikeforce, update & move to next row
  if (record.getCellValueAsString("JR - AM Status Table - Client Tier") == "VIP Strike") {
    console.log("Strikeforce!");
    await table.updateRecordAsync(record.id, {
      "Operator Type": {name:"SF"},
    });
    continue;
  }

  //If Not even eligible for TaskUs, update and move to next row
  if (record.getCellValueAsString("JR - TaskUs Eligible?") != "TRUE") {
    console.log("Local!");
    await table.updateRecordAsync(record.id, {
      "Operator Type": {name: "Local"},
    });

    continue;
  }


  //If eligible, see if it meets quotas
  if (record.getCellValueAsString("JR - TaskUs Eligible?") == "TRUE") {
    console.log("Could Be TaskUs!");
    let allQuotas = await createQuota();
    let quotaForRelevantDay = allQuotas.filter((q) => q.date == record.getCellValueAsString("Date"))[0]
    if(quotaForRelevantDay["has_capacity"]){
      console.log("TASKUS!");
      await table.updateRecordAsync(record.id, {
        "Operator Type": {name: "TU"},
      });


    } else {
      console.log("LOCAL!");
      await table.updateRecordAsync(record.id, {
        "Operator Type": {name: "Local"},
      });

    }

  }

}

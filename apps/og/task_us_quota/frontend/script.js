//Load Initial Data
let table = base.getTable("Event Schedule");
let view = table.getView("1.2 - Auto: Assign Operator Type");
let query = await view.selectRecordsAsync();

//Create quota & current schedule for TaskUs
const quotas = {
  "Saturday-Early": 5,
  "Saturday-Morning": 5,
  "Saturday-Midday": 5,
  "Sunday-Early": 5,
  "Sunday-Morning": 10,
  "Sunday-Midday": 5,
  "Sunday-Early": 5
}

function isAssignedToTaskUs(record) {
  return record.getCellValueAsString("Operator Type").includes("TU");
}

function getQuota(dayOfWeek, timeOfDay) {
  return quotas[dayOfWeek + "-" + timeOfDay]
}

function getAssigned(date, timeOfDay, recordsAssignedToTaskUs) {
  return recordsAssignedToTaskUs.records.filter(r => r.getCellValueAsString("Date") == date && r.getCellValueAsString("JR - Hour of Day Category (PT)") == timeOfDay).length
}

function getNextDay(date) {
  return new Date(new Date(date).setDate(date.getDate() + 1));
}


async function createQuota() {
  let taskUsView = table.getView("All TaskUs Assignments");
  let recordsAssignedToTaskUs = await taskUsView.selectRecordsAsync();

  //Get Days
  var date = new Date();
  var loop_count = 31;
  var days = [date];
  var next_day;
  var loop_index;

  for (loop_index = 1; loop_index <= loop_count; loop_index++) {
    next_day = getNextDay(next_day || date);
    days.push(next_day);
  }

  const timesOfDay = [{
    timeOfDay: "Early"
  }, {
    timeOfDay: "Morning"
  }, {
    timeOfDay: "Midday"
  }]

  var relevantDays = []
  days.filter((day) => day.getDay() == 0 || day.getDay() == 6).map((day) => {
    var date = day.toLocaleDateString("en-us", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).split("/").join("-");
    var dayOfWeek = day.toLocaleDateString("en-us", {
      weekday: "long"
    })
    timesOfDay.map(t => {

      var quota = getQuota(dayOfWeek, t.timeOfDay)
      var assigned = getAssigned(date, t.timeOfDay, recordsAssignedToTaskUs);

      relevantDays.push({
        date: date,
        dayOfWeek: dayOfWeek,
        timeOfDay: t.timeOfDay,
        quota: quota,
        assigned: assigned,
        has_capacity: quota > assigned
      })
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
    let quotaForRelevantDay = allQuotas.filter((q) => q.date == record.getCellValueAsString("Date") && q.timeOfDay == record.getCellValueAsString("JR - Hour of Day Category (PT)"))
    if(quotaForRelevantDay.has_capacity){
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

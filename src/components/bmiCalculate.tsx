import { useLedger } from '../redux/useLedger';
import { accountId } from '../redux/account';
import { useDispatch, useSelector } from "react-redux";
import { BMI_Day } from '../redux/userBMI';
import { UTCTimestamp, SeriesDataItemTypeMap, Time } from 'lightweight-charts';
import { decrypt } from './encryption';
// import { SeriesDataItemTypeMap } from 'lightweight-charts/dist/typings/series-options';


// todo: merge with userBMI
export interface UserBMIState {
  userBMI: BMI_Day[] | undefined;
}

// find BMI contract content
// output: [] || [description || {time: time, value: value}]
const findBMIblockchainContract = async (tempAccountId: string, Ledger2: any) => {
  var contractAddress:string = '';
  var description: any;
  var bmiArray: SeriesDataItemTypeMap['Area'][]= [];
  const processedBMIRecord: Array<any> = [];
  const bmiHashId = process.env.REACT_APP_BMI_MACHINE_CODE_HASH!.replace(/"/g, '');
  // var contractData: any;
  const contract = await Ledger2.contract.getContractsByAccount({ 
    accountId :tempAccountId,
    machineCodeHash: bmiHashId,
  });
  if (!contract) return [];
  if (!contract.hasOwnProperty('ats')) return [];

  contractAddress = contract.ats[0]?.at;


  if (!contractAddress) return []
  try {
    console.log(contract.ats[0]?.description, 'contract.ats[0]?.description')
    description = JSON.parse(contract.ats[0]?.description);
    description.time = new Date(description.time);
  } catch (error) {
    description = decrypt(contract.ats[0]?.description);
    description.time = new Date(description.time);
  }

  processedBMIRecord.push(description);


  const message = await Ledger2.account.getAccountTransactions({accountId:contractAddress}); //Contract Id
  console.log(message, 'message');
  console.log(description, 'description');



  for(let i = message.transactions.length - 1; i >= 0 ;i--){

    try {
      let tempRecord = JSON.parse(message.transactions[i].attachment.message);
      if (typeof tempRecord === 'number') continue;
      tempRecord.time = new Date(tempRecord.time);
      processedBMIRecord.push(tempRecord);
    } catch (error) {
      let content = decrypt(message.transactions[i].attachment.message);
      if (typeof content === 'number') continue;
      content.time = new Date(content.time);
      processedBMIRecord.push(content);
      console.log(description, 'description')
    }
  }
  
  return processedBMIRecord;
}

// find all the BMI record
// output: [] || [ {time: time, value: value} ]
export const findBMI = async (tempAccountId: string, Ledger2: any, today?: boolean | undefined) => {
  let BMI: SeriesDataItemTypeMap['Area'][]= [];

  if(Ledger2 == null) return [];

  const bmiDataObject = await findBMIblockchainContract(tempAccountId, Ledger2);
  console.log(bmiDataObject, 'bmiDataObject');

  if (!bmiDataObject) return [];

  // handle bmi contract message
  const message = bmiDataObject || null;
  console.log(message, 'bmiDataObject message');
  // if (!message) return [];
  let content: any;
  for(let i = message.length - 1; i >= 0 ;i--){
    content = message[i];
    let tempDate = content.time
    console.log(typeof tempDate, 'tempDate');
    let dateFormat: UTCTimestamp  = Math.floor((tempDate.getTime() / 1000)) as UTCTimestamp;

    BMI.push({time: dateFormat, value: Number(content.bmi)});
    // sort the BMI value by time asc
    BMI.sort((a,b) => (a.time > b.time) ? 1 : ((b.time > a.time) ? -1 : 0))

    // return_Date(Number(obj.timestamp));
  }
  return BMI;
}


export const isTodayHaveSelfieRecord = async (tempAccountId: string, Ledger2: any, bmi_fetchedData?: any) => {
  // if no ledger, return false
  if(Ledger2 == null) return false;
  const today = new Date();


  // if bmi_fetchedData, check if today have record
  if (bmi_fetchedData) {    
    console.log("bmi_fetchedData", bmi_fetchedData);
    for (let i = 0; i < bmi_fetchedData.length; i++) {
      const element = bmi_fetchedData[i];
      const elementDate = new Date(element.time * 1000);
      if (elementDate.getDate() === today.getDate() && elementDate.getMonth() === today.getMonth() && elementDate.getFullYear() === today.getFullYear()) {
        console.log('hihi')
        return true;
      };
    }
    return false;
  }
  console.log("here");

  // if no bmi_fetchedData, fetch data from blockchain and check if today have record
  const contract = await findBMIblockchainContract(tempAccountId, Ledger2);
  console.log("there");
  if (!contract) return false;

  const message = contract;

  let BMI: SeriesDataItemTypeMap['Area'][]= [];


  // handle bmi contract message
  for(let i = message.length - 1; i >= 0 ;i--){
    let content = message[i];

    let tempDate = content.time

    console.log(tempDate.getDate(), today.getDate(), 'today', 'tmr');
    if (tempDate.getDate() === today.getDate() && tempDate.getMonth() === today.getMonth() && tempDate.getFullYear() === today.getFullYear()) {
      console.log('today have record');
      return true;
    };
  }

  return false;
}

export const isSelfieRecord = async (tempAccountId: string, Ledger2: any) => {
  const message = await findBMIblockchainContract(tempAccountId, Ledger2)
  console.log(message, 'message');
  // if no ledger, return false
  if (message.length === 0) return false;//Strange?
  return true;
}

export const getBMIRecordDay = async (tempAccountId: string, Ledger2: any) => {
  const message = await findBMIblockchainContract(tempAccountId, Ledger2)
  console.log(message, 'message');
  // if no ledger, return false

  // dates.sort((a, b) => a.getTime() - b.getTime());

  // let longestConsecutive = 1;
  // let currentConsecutive = 1;

  // for (let i = 1; i < dates.length; i++) {
  //   const diffInDays = Math.floor(
  //     (dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
  //   );

  //   if (diffInDays === 1) {
  //     currentConsecutive++;
  //   } else if (diffInDays > 1) {
  //     longestConsecutive = Math.max(longestConsecutive, currentConsecutive);
  //     currentConsecutive = 1;
  //   }
  // }

  // return Math.max(longestConsecutive, currentConsecutive);


  return message.length;
}
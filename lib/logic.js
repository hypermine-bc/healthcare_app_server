/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';
/**
 * Write your transction processor functions here
 */

/**
 * Sample transaction
 * @param {org.example.iqvia.SampleTransaction} sampleTransaction
 * @transaction
 */
async function sampleTransaction(tx) {
    // Save the old value of the asset.
    const oldValue = tx.asset.value;

    // Update the asset with the new value.
    tx.asset.value = tx.newValue;

    // Get the asset registry for the asset.
    const assetRegistry = await getAssetRegistry('org.example.iqvia.moneyRequest');
    // Update the asset in the asset registry.
    await assetRegistry.update(tx.asset);

    // Emit an event for the modified asset.
    let event = getFactory().newEvent('org.example.iqvia', 'SampleEvent');
    event.asset = tx.asset;
    event.oldValue = oldValue;
    event.newValue = tx.newValue;
    emit(event);
}



/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.AddDoctorPrescription} addDoctorPrescription
 * @transaction
 */

async function addDoctorPrescription(tx) {
  var factory = getFactory();
  var NS = 'org.example.iqvia';
  var asset = NS + '.DoctorPrescription';
  var patasset = NS + '.PatientNotification';
  var doctor = factory.newResource(NS, 'DoctorPrescription', tx.prescriptionId);
  var patient = factory.newResource(NS, 'PatientNotification', 'PAT_' + tx.prescriptionId);
  var doctorRelationship = factory.newRelationship(NS, 'Doctor', tx.doctor.email);
  var userRelationship = factory.newRelationship(NS, 'Patient', tx.user.email);
  var medRelationship = factory.newRelationship(NS, 'Medicine', tx.medUsed.MedId);
  patient.medicineUsed = medRelationship;
  doctor.medicineUsed = medRelationship;
  patient.doctor = doctorRelationship;
  patient.user = userRelationship;
  doctor.doctor = doctorRelationship;
  doctor.user = userRelationship;
  doctor.TransferStatus = tx.TransferStatus;
  patient.TransferStatus = 'INIT';
  doctor.type = tx.type;
  patient.type = tx.type;
  doctor.comments = tx.comments;
  patient.comments = tx.comments;
  //doctor.transferBalance = tx.transferBalance;
  
  const docAssetRegistry = await getAssetRegistry(asset);
  await docAssetRegistry.addAll([doctor]);
  const patAssetRegistry = await getAssetRegistry(patasset);
  await patAssetRegistry.addAll([patient]);
  return 0;
}

/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.SignPatientPrescription} signPatientPrescription
 * @transaction
 */

async function signPatientPrescription(tx) {
  var factory = getFactory();
  var NS = 'org.example.iqvia';
  var patasset = NS + '.PatientNotification';
  var newPatAsset = tx.patAsset;
  newPatAsset.TransferStatus = 'IN_PROGRESS';
  
  const patAssetRegistry = await getAssetRegistry(patasset);
  await patAssetRegistry.update(newPatAsset);
  return 0;
}

/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.SignDoctorPrescription} signDoctorPrescription
 * @transaction
 */

async function signDoctorPrescription(tx) {
  var factory = getFactory();
  var NS = 'org.example.iqvia';
  var patasset = NS + '.PatientNotification';
  var docasset = NS + '.DoctorPrescription';
  var iqviaasset = NS + '.IQVIADoctorNotification';
  var newPatAsset = tx.patAsset;
  var newDocAsset = tx.docAsset;
  if(newPatAsset.TransferStatus == 'IN_PROGRESS') {
    
  	var iqvia = factory.newResource(NS, 'IQVIADoctorNotification', (newDocAsset.user.firstname + newDocAsset.prescriptionId));
    var doctorRelationship = factory.newRelationship(NS, 'DoctorPrescription', newDocAsset.prescriptionId);
    var userRelationship = factory.newRelationship(NS, 'PatientNotification', newPatAsset.prescriptionId);
  	var medRelationship = factory.newRelationship(NS, 'Medicine', newDocAsset.medicineUsed.MedId);
    iqvia.medicineUsed = medRelationship;
    iqvia.patNoti = userRelationship;
    iqvia.docPresc = doctorRelationship;
    iqvia.TransferStatus = 'INIT';
    iqvia.type = newDocAsset.type;
    iqvia.comments = newDocAsset.comments;
    
    const iqviaAssetRegistry = await getAssetRegistry(iqviaasset);
    await iqviaAssetRegistry.addAll([iqvia]);
    
  	newDocAsset.TransferStatus = 'IN_PROGRESS';

    const docAssetRegistry = await getAssetRegistry(docasset);
    await docAssetRegistry.update(newDocAsset);
    return 0;
  }
}

/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.SignIqviaPrescription} signIqviaPrescription
 * @transaction
 */

async function signIqviaPrescription(tx) {
  var factory = getFactory();
  var NS = 'org.example.iqvia';
  var payerAsset = NS + '.PayerNotification';
  var txIqviaAsset = tx.iqviaDocAsset;

  var payer = factory.newResource(NS, 'PayerNotification', ('REQ_'+ txIqviaAsset.prescriptionId));
  var userPrescRelationship = factory.newRelationship(NS, 'IQVIADoctorNotification', txIqviaAsset.prescriptionId);
  payer.userDetail = userPrescRelationship;
  payer.reqMoney = tx.moneyPatientWanted;
  payer.recvMoney = 0;
  payer.comments = txIqviaAsset.comments;

  const payerAssetRegistry = await getAssetRegistry(payerAsset);
  await payerAssetRegistry.addAll([payer]);
  
  txIqviaAsset.TransferStatus = 'IN_PROGRESS';
  
  const iqviaDocAssetRegistry =  await getAssetRegistry(NS + '.IQVIADoctorNotification');
  await iqviaDocAssetRegistry.update(txIqviaAsset);
  return 0;
}

/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.SignIqviaPrescription} signIqviaPrescription
 * @transaction
 */

/*async function signIqviaPrescription(tx) {
  var factory = getFactory();
  var NS = 'org.example.iqvia';
  var payerAsset = NS + '.PayerNotification';
  var txIqviaAsset = tx.iqviaDocAsset;

  var payer = factory.newResource(NS, 'PayerNotification', ('REQ_'+ txIqviaAsset.prescriptionId));
  var userPrescRelationship = factory.newRelationship(NS, 'IQVIADoctorNotification', txIqviaAsset.prescriptionId);
  payer.userDetail = userPrescRelationship;
  payer.reqMoney = tx.moneyPatientWanted;
  payer.recvMoney = 0;
  payer.comments = txIqviaAsset.comments;

  const payerAssetRegistry = await getAssetRegistry(payerAsset);
  await payerAssetRegistry.addAll([payer]);
  return 0;
}*/

/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.DonateMoneyFromPharma} donateMoneyFromPharma
 * @transaction
 */

async function donateMoneyFromPharma(tx) {
  var factory = getFactory();
  var NS = 'org.example.iqvia';
  var iqviaAsset = NS + '.IQVIAPharmaNotification';
  var txIqviaAsset = tx;

  var payerDonate = factory.newResource(NS, 'IQVIAPharmaNotification', 'DON_PHA_'+ txIqviaAsset.pharmaMoney.notificationId);
  var userPrescRelationship = factory.newRelationship(NS, 'IQVIADoctorNotification', txIqviaAsset.pharmaMoney.userDetail.prescriptionId);
  var pharmaRelationship = factory.newRelationship(NS, 'Pharma', txIqviaAsset.pharma.email);
  payerDonate.userDetail = userPrescRelationship;
  payerDonate.pharma = pharmaRelationship;
  payerDonate.investedMoney = tx.moneyDonation;

  const payerAssetRegistry = await getAssetRegistry(iqviaAsset);
  await payerAssetRegistry.addAll([payerDonate]);
  return 0;
}

/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.DonateMoneyFromCharity} donateMoneyFromCharity
 * @transaction
 */

async function donateMoneyFromCharity(tx) {
  var factory = getFactory();
  var NS = 'org.example.iqvia';
  var iqviaAsset = NS + '.IQVIACharityNotification';
  var txIqviaAsset = tx;

  var payerDonate = factory.newResource(NS, 'IQVIACharityNotification', 'DON_CHA_'+ txIqviaAsset.charityMoney.notificationId);
  var userPrescRelationship = factory.newRelationship(NS, 'IQVIADoctorNotification', txIqviaAsset.charityMoney.userDetail.prescriptionId);
  var charityRelationship = factory.newRelationship(NS, 'Charity', txIqviaAsset.charity.email);
  payerDonate.userDetail = userPrescRelationship;
  payerDonate.charity = charityRelationship;
  payerDonate.investedMoney = tx.moneyDonation;

  const payerAssetRegistry = await getAssetRegistry(iqviaAsset);
  await payerAssetRegistry.addAll([payerDonate]);
  return 0;
}

/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.ConfirmMoneyFromCharity} confirmMoneyFromCharity
 * @transaction
 */

async function confirmMoneyFromCharity(tx) {
  var factory = getFactory();
  var NS = 'org.example.iqvia';
  
  var payerAsset = NS + '.PayerNotification';
  var charityDonateAsset = NS + '.IQVIACharityNotification';
  
  var newCharityMoney = tx.charityMoney;
  var newCharityNoti = tx.charityNoti;
  
  newCharityMoney.recvMoney = newCharityNoti.investedMoney;
  if(newCharityMoney.recvMoney == newCharityMoney.reqMoney) {
    console.log('100% consenses acquired');
    newCharityMoney.userDetail.docPresc.TransferStatus = 'SUCCESS';
    newCharityMoney.userDetail.patNoti.TransferStatus = 'SUCCESS';
    newCharityMoney.userDetail.TransferStatus = 'SUCCESS';
    newCharityMoney.userDetail.patNoti.user.accountBalance = newCharityMoney.reqMoney;
  }
  return 0;
}

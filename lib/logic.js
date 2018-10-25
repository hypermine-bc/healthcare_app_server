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
  var prescId = 'PRE_' +tx.user.firstName+ Math.floor(100 + Math.random() * 900);
  var doctor = factory.newResource(NS, 'DoctorPrescription', prescId);
  var patient = factory.newResource(NS, 'PatientNotification', 'PAT_' + prescId);
  var doctorRelationship = factory.newRelationship(NS, 'Doctor', tx.doctor.email);
  var userRelationship = factory.newRelationship(NS, 'Patient', tx.user.email);
  for( var i=0; i<tx.medUsed.length; i++){
    var medRelationship = factory.newRelationship(NS, 'Medicine', tx.medUsed[i].MedId);
    if(doctor.medicineUsed) {
    	doctor.medicineUsed.push(medRelationship);
    } else {
    	doctor.medicineUsed = [medRelationship];
    }
    if(patient.medicineUsed) {
    	patient.medicineUsed.push(medRelationship);
    } else {
    	patient.medicineUsed = [medRelationship];
    }
  }
  patient.doctor = doctorRelationship;
  patient.user = userRelationship;
  doctor.doctor = doctorRelationship;
  doctor.user = userRelationship;
  doctor.TransferStatus = tx.TransferStatus;
  patient.TransferStatus = 'INIT';
  doctor.comments = tx.comments;
  patient.comments = tx.comments;
  //doctor.transferBalance = tx.transferBalance;
  
  const patAssetRegistry = await getAssetRegistry(patasset);
  await patAssetRegistry.addAll([patient]);
  
  
  var patientRelationship = factory.newRelationship(NS, 'PatientNotification', 'PAT_' + prescId);
  doctor.patientNoti = patientRelationship;
  const docAssetRegistry = await getAssetRegistry(asset);
  await docAssetRegistry.addAll([doctor]);
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
  var newDocAsset = tx.docAsset;
  var newPatAsset = newDocAsset.patientNoti;
  if(newPatAsset.TransferStatus == 'IN_PROGRESS') {
    
  	var iqvia = factory.newResource(NS, 'IQVIADoctorNotification', ('IQVIA-' + newDocAsset.prescriptionId));
    var doctorRelationship = factory.newRelationship(NS, 'DoctorPrescription', newDocAsset.prescriptionId);
    var userRelationship = factory.newRelationship(NS, 'PatientNotification', newPatAsset.prescriptionId);
    for( var i=0; i<newDocAsset.medicineUsed.length; i++){
      var medRelationship = factory.newRelationship(NS, 'Medicine', newDocAsset.medicineUsed[i].MedId);
      if(iqvia.medicineUsed) {
          iqvia.medicineUsed.push(medRelationship);
      } else {
          iqvia.medicineUsed = [medRelationship];
      }
    }
    iqvia.patNoti = userRelationship;
    iqvia.docPresc = doctorRelationship;
    iqvia.TransferStatus = 'INIT';
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
  var payerAsset = NS + '.InsuranceNotification';
  var pharmaAsset = NS + '.PharmaNotification';
  var txIqviaAsset = tx.iqviaDocAsset;

  if(txIqviaAsset.docPresc.user.patientInsurance) {
    if(txIqviaAsset.docPresc.user.patientInsurance.InsuranceStatus == true ) {
      var payer = factory.newResource(NS, 'InsuranceNotification', ('INSU_'+ txIqviaAsset.prescriptionId));
      var userPrescRelationship = factory.newRelationship(NS, 'IQVIADoctorNotification', txIqviaAsset.prescriptionId);
      payer.userDetail = userPrescRelationship;
      payer.reqMoney = tx.moneyPatientWanted;
      payer.TransferStatus = 'INIT';
      payer.percentageCoverd = 0;
      payer.comments = txIqviaAsset.comments;

      const payerAssetRegistry = await getAssetRegistry(payerAsset);
      await payerAssetRegistry.addAll([payer]);
    } else {
      var pharma = factory.newResource(NS, 'PharmaNotification', ('PHA_'+ txIqviaAsset.prescriptionId));
      var userPrescRelationship = factory.newRelationship(NS, 'IQVIADoctorNotification', txIqviaAsset.prescriptionId);
      pharma.userDetail = userPrescRelationship;
      pharma.reqMoney = tx.moneyPatientWanted;
      pharma.TransferStatus = 'INIT';
      pharma.percentageCoverd = 0;
      pharma.comments = txIqviaAsset.comments;

      const pharmaAssetRegistry = await getAssetRegistry(pharmaAsset);
      await pharmaAssetRegistry.addAll([pharma]);
    }
  } else {
      var pharma = factory.newResource(NS, 'PharmaNotification', ('PHA'+ txIqviaAsset.prescriptionId));
      var userPrescRelationship = factory.newRelationship(NS, 'IQVIADoctorNotification', txIqviaAsset.prescriptionId);
      pharma.userDetail = userPrescRelationship;
      pharma.reqMoney = tx.moneyPatientWanted;
      pharma.TransferStatus = 'INIT';
      pharma.percentageCoverd = 0;
      pharma.comments = txIqviaAsset.comments;

      const pharmaAssetRegistry = await getAssetRegistry(pharmaAsset);
      await pharmaAssetRegistry.addAll([pharma]);
   }
  
  txIqviaAsset.TransferStatus = 'IN_PROGRESS';
  
  const iqviaDocAssetRegistry =  await getAssetRegistry(NS + '.IQVIADoctorNotification');
  await iqviaDocAssetRegistry.update(txIqviaAsset);
  return 0;
}

/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.DonateMoneyFromPharma} donateMoneyFromPharma
 * @transaction
 */

async function donateMoneyFromPharma(tx) {


  var factory = getFactory();
  var NS = 'org.example.iqvia';
  var charityAsset = NS + '.CharityNotification';
  var iqviaAsset = NS + '.IQVIAPayerNotification';
  var txIqviaAsset = tx;

  //if(tx.percentage <= 100) {
    if(tx.percentage <= (100-txIqviaAsset.pharmaNoti.percentageCoverd)) {

      var donatedetail = factory.newConcept(NS, 'DonateDetail');
      var pharmaDetail = factory.newResource(NS, 'Pharma', tx.pharma.email);
      donatedetail.percentageCovered = tx.percentage;
      donatedetail.donatedPharma = pharmaDetail;
      if(tx.pharmaNoti.donateDetail) {
        tx.pharmaNoti.donateDetail.push(donatedetail);
      } else {
        tx.pharmaNoti.donateDetail = [donatedetail];
      }
      
      tx.pharmaNoti.percentageCoverd = tx.pharmaNoti.percentageCoverd+tx.percentage;
      const iqviaDocAssetRegistry =  await getAssetRegistry(NS + '.PharmaNotification');
      await iqviaDocAssetRegistry.update(tx.pharmaNoti);

      if(txIqviaAsset.pharmaNoti.percentageCoverd == 100) {
        /* Create a PayerNotofication on all tha transaction*/
        var iqvia = factory.newResource(NS, 'IQVIAPayerNotification', ('IQVIA_PAY_'+ txIqviaAsset.pharmaNoti.userDetail.prescriptionId));
        var userPrescRelationship = factory.newRelationship(NS, 'IQVIADoctorNotification', txIqviaAsset.pharmaNoti.userDetail.prescriptionId);
        iqvia.userDetail = userPrescRelationship;
        iqvia.TransferStatus = "INIT";
        for( var i=0; i<tx.pharmaNoti.donateDetail.length; i++) {
          var pharmadonatedetail = factory.newConcept(NS, 'DonateDetail');
          var pharmaDetail = factory.newResource(NS, 'Pharma', tx.pharmaNoti.donateDetail[i].donatedPharma.email);
          pharmadonatedetail.percentageCovered = tx.pharmaNoti.donateDetail[i].percentageCovered;
          pharmadonatedetail.donatedPharma = pharmaDetail;
          if(iqvia.donateDetail) {
            iqvia.donateDetail.push(pharmadonatedetail);
          } else {
            iqvia.donateDetail = [pharmadonatedetail];
          }
        }
        if(txIqviaAsset.pharmaNoti.userDetail.docPresc.user.patientInsurance) {
          if(txIqviaAsset.pharmaNoti.userDetail.docPresc.user.patientInsurance.InsuranceStatus != false) {

            for( var j=0; j<tx.pharmaNoti.insuranceNoti.donateDetail.length; j++) {
              var insurancedonatedetail = factory.newConcept(NS, 'DonateDetail');
              var insuranceDetail = factory.newResource(NS, 'Insurance', tx.pharmaNoti.insuranceNoti.donateDetail[j].donateInsurance.email);
              insurancedonatedetail.percentageCovered = tx.pharmaNoti.insuranceNoti.donateDetail[j].percentageCovered;
              insurancedonatedetail.donateInsurance = insuranceDetail;
              if(iqvia.donateDetail) {
                iqvia.donateDetail.push(insurancedonatedetail);
              } else {
                iqvia.donateDetail = [insurancedonatedetail];
              }
            }
          }
        }
        iqvia.reqMoney = tx.pharmaNoti.reqMoney;
        const payerAssetRegistry = await getAssetRegistry(iqviaAsset);
        await payerAssetRegistry.addAll([iqvia]);
      } else {

        var charity = factory.newResource(NS, 'CharityNotification', ('CHAR_'+ txIqviaAsset.pharmaNoti.userDetail.prescriptionId));
        if(txIqviaAsset.pharmaNoti.insuranceNoti) {
          var insuranceRelation = factory.newRelationship(NS, 'InsuranceNotification', txIqviaAsset.pharmaNoti.insuranceNoti.notificationId);
          charity.insuranceNoti = insuranceRelation;
        }
        var pharmaRelation = factory.newRelationship(NS, 'PharmaNotification', txIqviaAsset.pharmaNoti.notificationId);
        var userPrescRelationship = factory.newRelationship(NS, 'IQVIADoctorNotification', txIqviaAsset.pharmaNoti.userDetail.prescriptionId);
        charity.pharmaNoti = pharmaRelation;
        charity.userDetail = userPrescRelationship;
        charity.reqMoney = tx.pharmaNoti.reqMoney;
        charity.TransferStatus = 'IN_PROGRESS';
        charity.percentageCoverd = tx.pharmaNoti.percentageCoverd;
        charity.comments = tx.pharmaNoti.userDetail.comments;

        const payerAssetRegistry = await getAssetRegistry(charityAsset);
        await payerAssetRegistry.addAll([charity]);

      }
    }
  //} else {
    /*tx.pharmaNoti.percentageCoverd = 100;
    var donatedetail = factory.newConcept(NS, 'DonateDetail');
    var pharmaDetail = factory.newResource(NS, 'Pharma', tx.pharma.email);
    donatedetail.percentageCovered = tx.percentage;
    donatedetail.donatedPharma = pharmaDetail;
    if(tx.pharmaNoti.donateDetail) {
      tx.pharmaNoti.donateDetail.push(donatedetail);
    } else {
      tx.pharmaNoti.donateDetail = [donatedetail];
    }
    
    const iqviaDocAssetRegistry =  await getAssetRegistry(NS + '.PharmaNotification');
    await iqviaDocAssetRegistry.update(tx.pharmaNoti);*/
  //}

}

/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.DonateMoneyFromCharity} donateMoneyFromCharity
 * @transaction
 */

async function donateMoneyFromCharity(tx) {

  var factory = getFactory();
  var NS = 'org.example.iqvia';
  iqviaAsset = NS + '.IQVIAPayerNotification';
  var txIqviaAsset = tx;

  if(tx.percentage <= (100-txIqviaAsset.charityNoti.percentageCoverd)) {
    
    /*Update the current Charity asset from the transaction*/
    tx.charityNoti.percentageCoverd = tx.charityNoti.percentageCoverd+tx.percentage;
    var donatedetail = factory.newConcept(NS, 'DonateDetail');
    var charityDetail = factory.newResource(NS, 'Charity', tx.charity.email);
    donatedetail.percentageCovered = tx.percentage;
    donatedetail.donatedCharity = charityDetail;
    if(tx.charityNoti.donateDetail) {
      tx.charityNoti.donateDetail.push(donatedetail);
    } else {
      tx.charityNoti.donateDetail = [donatedetail];
    }
    const iqviaDocAssetRegistry =  await getAssetRegistry(NS + '.CharityNotification');
    await iqviaDocAssetRegistry.update(tx.charityNoti);
    
    if(tx.charityNoti.percentageCoverd == 100) {
      /* Create a PayerNotofication on all tha transaction*/
      var iqvia = factory.newResource(NS, 'IQVIAPayerNotification', ('IQVIA_PAY_'+ txIqviaAsset.charityNoti.userDetail.prescriptionId));
      var userPrescRelationship = factory.newRelationship(NS, 'IQVIADoctorNotification', txIqviaAsset.charityNoti.userDetail.prescriptionId);
      iqvia.userDetail = userPrescRelationship;
      iqvia.TransferStatus = "INIT";
      for( var i=0; i<tx.charityNoti.pharmaNoti.donateDetail.length; i++) {
        var pharmadonatedetail = factory.newConcept(NS, 'DonateDetail');
        var pharmaDetail = factory.newResource(NS, 'Pharma', tx.charityNoti.pharmaNoti.donateDetail[i].donatedPharma.email);
        pharmadonatedetail.percentageCovered = tx.charityNoti.pharmaNoti.donateDetail[i].percentageCovered;
        pharmadonatedetail.donatedPharma = pharmaDetail;
        if(iqvia.donateDetail) {
          iqvia.donateDetail.push(pharmadonatedetail);
        } else {
          iqvia.donateDetail = [pharmadonatedetail];
        }
      }

      if(txIqviaAsset.charityNoti.userDetail.docPresc.user.patientInsurance) {
        if(txIqviaAsset.charityNoti.userDetail.docPresc.user.patientInsurance.InsuranceStatus == true) {
          for( var j=0; j<tx.charityNoti.insuranceNoti.donateDetail.length; j++) {
            var insurancedonatedetail = factory.newConcept(NS, 'DonateDetail');
            var insuranceDetail = factory.newResource(NS, 'Insurance', tx.charityNoti.insuranceNoti.donateDetail[j].donateInsurance.email);
            insurancedonatedetail.percentageCovered = tx.charityNoti.insuranceNoti.donateDetail[j].percentageCovered;
            insurancedonatedetail.donateInsurance = insuranceDetail;
            if(iqvia.donateDetail) {
              iqvia.donateDetail.push(insurancedonatedetail);
            } else {
              iqvia.donateDetail = [insurancedonatedetail];
            }
          }
        }
      }
      for( var k=0; k<tx.charityNoti.donateDetail.length; k++) {
        var charitydonatedetail = factory.newConcept(NS, 'DonateDetail');
        var charityDetail = factory.newResource(NS, 'Charity', tx.charityNoti.donateDetail[k].donatedCharity.email);
        charitydonatedetail.percentageCovered = tx.charityNoti.donateDetail[k].percentageCovered;
        charitydonatedetail.donatedCharity = charityDetail;
        if(iqvia.donateDetail) {
          iqvia.donateDetail.push(charitydonatedetail);
        } else {
          iqvia.donateDetail = [charitydonatedetail];
        }
      }	
      iqvia.reqMoney = tx.charityNoti.reqMoney;
      const payerAssetRegistry = await getAssetRegistry(iqviaAsset);
      await payerAssetRegistry.addAll([iqvia]);
    }
  }
  
}


/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.DonateMoneyFromInsurance} donateMoneyFromInsurance
 * @transaction
 */

async function donateMoneyFromInsurance(tx) {
  var factory = getFactory();
  var NS = 'org.example.iqvia';
  pharmaAsset = NS + '.PharmaNotification';
  insuranceAsset = NS + '.InsuranceNotification';
  var txIqviaAsset = tx;

  //if(tx.percentage <= 99) {
  if(tx.percentage <= (100-txIqviaAsset.insuranceNoti.percentageCoverd)) {

    var donatedetail = factory.newConcept(NS, 'DonateDetail');
    var insuranceDetail = factory.newResource(NS, 'Insurance', tx.insuranceCompany.email);
    donatedetail.percentageCovered = tx.percentage;
    donatedetail.donateInsurance = insuranceDetail;
    if(tx.insuranceNoti.donateDetail) {
      tx.insuranceNoti.donateDetail.push(donatedetail);
    } else {
      tx.insuranceNoti.donateDetail = [donatedetail];
    }

    tx.insuranceNoti.percentageCoverd = tx.insuranceNoti.percentageCoverd+tx.percentage;
    const iqviaDocAssetRegistry =  await getAssetRegistry(insuranceAsset);
    await iqviaDocAssetRegistry.update(tx.insuranceNoti);

    if( tx.insuranceNoti.percentageCoverd == 100 ) {
      /* Create a PayerNotofication on all tha transaction*/
      var iqvia = factory.newResource(NS, 'IQVIAPayerNotification', ('IQVIA_PAY_'+ txIqviaAsset.insuranceNoti.userDetail.prescriptionId));
      var userPrescRelationship = factory.newRelationship(NS, 'IQVIADoctorNotification', txIqviaAsset.insuranceNoti.userDetail.prescriptionId);
      iqvia.userDetail = userPrescRelationship;
      iqvia.TransferStatus = "INIT";
      if(txIqviaAsset.insuranceNoti.userDetail.docPresc.user.patientInsurance) {
        if(txIqviaAsset.insuranceNoti.userDetail.docPresc.user.patientInsurance.InsuranceStatus != false) {

          for( var j=0; j<tx.insuranceNoti.donateDetail.length; j++) {
            var insurancedonatedetail = factory.newConcept(NS, 'DonateDetail');
            var insuranceDetail = factory.newResource(NS, 'Insurance', tx.insuranceNoti.donateDetail[j].donateInsurance.email);
            insurancedonatedetail.percentageCovered = tx.insuranceNoti.donateDetail[j].percentageCovered;
            insurancedonatedetail.donateInsurance = insuranceDetail;
            if(iqvia.donateDetail) {
              iqvia.donateDetail.push(insurancedonatedetail);
            } else {
              iqvia.donateDetail = [insurancedonatedetail];
            }
          }
        }
      }
      iqvia.reqMoney = tx.insuranceNoti.reqMoney;
      const payerAssetRegistry = await getAssetRegistry(iqviaAsset);
      await payerAssetRegistry.addAll([iqvia]);
    } else {
      var pharma = factory.newResource(NS, 'PharmaNotification', ('PHA_'+ txIqviaAsset.insuranceNoti.notificationId));
      var userPrescRelationship = factory.newRelationship(NS, 'IQVIADoctorNotification', txIqviaAsset.insuranceNoti.userDetail.prescriptionId);
      var insuranceRelation = factory.newRelationship(NS, 'InsuranceNotification', txIqviaAsset.insuranceNoti.notificationId);
      pharma.insuranceNoti = insuranceRelation;
      pharma.userDetail = userPrescRelationship;
      pharma.reqMoney = tx.insuranceNoti.reqMoney;
      pharma.TransferStatus = 'IN_PROGRESS';
      pharma.percentageCoverd = tx.insuranceNoti.percentageCoverd;
      pharma.comments = tx.insuranceNoti.userDetail.comments;

      const payerAssetRegistry = await getAssetRegistry(pharmaAsset);
      await payerAssetRegistry.addAll([pharma]);
    }
  } else {
	/*
    var donatedetail = factory.newConcept(NS, 'DonateDetail');
    var insuranceDetail = factory.newResource(NS, 'Insurance', tx.insuranceCompany.email);
    donatedetail.percentageCovered = tx.percentage;
    donatedetail.donateInsurance = insuranceDetail;
    if(tx.insuranceNoti.donateDetail) {
      tx.insuranceNoti.donateDetail.push(donatedetail);
    } else {
      tx.insuranceNoti.donateDetail = [donatedetail];
    }

    tx.insuranceNoti.percentageCoverd = 100;
    
    const iqviaDocAssetRegistry =  await getAssetRegistry(NS + '.InsuranceNotification');
    await iqviaDocAssetRegistry.update(tx.insuranceNoti);
    */
  }
}


/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.ConfirmMoneyFromPharma} confirmMoneyFromPharma
 * @transaction
 */

/*async function confirmMoneyFromPharma(tx) {
  var factory = getFactory();
  var NS = 'org.example.iqvia';
  
  var payerAsset = NS + '.PayerNotification';
  var pharmaDonateAsset = NS + '.IQVIAPharmaNotification';
  
  var newPharmaNoti = tx.pharmaNoti;
  var newPharmaMoney = newPharmaNoti.payerNoti;
  
  if(newPharmaMoney.recvMoney < newPharmaMoney.reqMoney) {
    newPharmaMoney.recvMoney = newPharmaMoney.recvMoney+newPharmaNoti.investedMoney;
    if(newPharmaMoney.recvMoney == newPharmaMoney.reqMoney) {
      console.log('100% consenses acquired');
      var userParticipant = NS + '.Patient';
      var iqviaDocNotiAsset = NS + '.IQVIADoctorNotification';
      var docPrescAsset = NS + '.DoctorPrescription';
      var patNotiAsset = NS + '.PatientNotification';
      newPharmaMoney.userDetail.docPresc.TransferStatus = 'SUCCESS';
      newPharmaMoney.userDetail.patNoti.TransferStatus = 'SUCCESS';
      newPharmaMoney.userDetail.TransferStatus = 'SUCCESS';
      newPharmaMoney.userDetail.patNoti.user.accountBalance = newPharmaMoney.userDetail.patNoti.user.accountBalance+newPharmaMoney.reqMoney;

      const userParticipantRegistry =  await getParticipantRegistry(userParticipant);
      await userParticipantRegistry.update(newPharmaMoney.userDetail.patNoti.user);

      const iqviaDocNotiAssetRegistry = await getAssetRegistry(iqviaDocNotiAsset);
      await iqviaDocNotiAssetRegistry.update(newPharmaMoney.userDetail);

      const docPrescAssetRegistry = await getAssetRegistry(docPrescAsset);
      await docPrescAssetRegistry.update(newPharmaMoney.userDetail.docPresc);

      const patNotiAssetRegistry = await getAssetRegistry(patNotiAsset);
      await patNotiAssetRegistry.update(newPharmaMoney.userDetail.patNoti);
    }
    var donatedetail = factory.newConcept(NS, 'DonateDetail');
    var pharmaDetail = factory.newResource(NS, 'Charity', newPharmaNoti.pharma.email);
    donatedetail.InvestedMoney = newPharmaNoti.investedMoney;
    donatedetail.donatedCharity = pharmaDetail;
    if(newPharmaMoney.donateDetail) {
      newPharmaMoney.donateDetail.push(donatedetail);
    } else {
      newPharmaMoney.donateDetail = [donatedetail];
    }
    const payerNotiAssetRegistry = await getAssetRegistry(payerAsset);
    await payerNotiAssetRegistry.update(newPharmaMoney);
  }
  return 0;
}*/

/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.ConfirmPayerNotification} confirmPayerNotification
 * @transaction
 */

async function confirmPayerNotification(tx) {
  var factory = getFactory();
  var NS = 'org.example.iqvia';
  var pharmaAsset = NS + '.PharmaTokenReleaseNotification';
  var txIqviaAsset = tx.payerNoti;

  var pharma = factory.newResource(NS, 'PharmaTokenReleaseNotification', ('PHA_'+ txIqviaAsset.userDetail.prescriptionId));
  var userPrescRelationship = factory.newRelationship(NS, 'IQVIADoctorNotification', txIqviaAsset.userDetail.prescriptionId);
  var pharmaRelationship = factory.newRelationship(NS, 'Pharma', tx.pharma.email);
  pharma.pharma = pharmaRelationship;
  pharma.userDetail = userPrescRelationship;
  pharma.tokenBalance = ((txIqviaAsset.reqMoney * tx.percentage)/100);
  pharma.TransferStatus = 'INIT';

  const payerAssetRegistry = await getAssetRegistry(pharmaAsset);
  await payerAssetRegistry.addAll([pharma]);
  
  txIqviaAsset.TransferStatus = 'IN_PROGRESS';
  
  const iqviaDocAssetRegistry =  await getAssetRegistry(NS + '.IQVIAPayerNotification');
  await iqviaDocAssetRegistry.update(txIqviaAsset);
  
  tx.pharma.accountBalance = tx.pharma.accountBalance+pharma.tokenBalance;
  
  const pharmaParticipantRegistry =  await getParticipantRegistry(NS + '.Pharma');
  await pharmaParticipantRegistry.update(tx.pharma);
  return 0;
}

/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.ReleaseTokenToDistributor} releaseTokenToDistributor
 * @transaction
 */

async function releaseTokenToDistributor(tx) {
  var factory = getFactory();
  var NS = 'org.example.iqvia';
  var distAsset = NS + '.DistributorNotification';
  var txIqviaAsset = tx.pharmaNoti;

  var distri = factory.newResource(NS, 'DistributorNotification', ('DIST_'+ txIqviaAsset.userDetail.prescriptionId));
  var userRelationship = factory.newRelationship(NS, 'Patient', txIqviaAsset.userDetail.docPresc.user.email);
  var distriRelationship = factory.newRelationship(NS, 'Distributor', tx.distributor.email);
  distri.patient = userRelationship;
  for( var i=0; i<txIqviaAsset.userDetail.docPresc.medicineUsed.length; i++){
    var medRelationship = factory.newRelationship(NS, 'Medicine', txIqviaAsset.userDetail.docPresc.medicineUsed[i].MedId);
    if(distri.medUsed) {
      distri.medUsed.push(medRelationship);
    } else {
      distri.medUsed = [medRelationship];
    }
  }
  distri.distributor = distriRelationship;
  distri.tokenBalance = (((txIqviaAsset.tokenBalance * tx.percentage)/100));
  distri.TransferStatus = 'INIT';

  const payerAssetRegistry = await getAssetRegistry(distAsset);
  await payerAssetRegistry.addAll([distri]);
  
  txIqviaAsset.TransferStatus = 'IN_PROGRESS';
  
  const iqviaDocAssetRegistry =  await getAssetRegistry(NS + '.PharmaTokenReleaseNotification');
  await iqviaDocAssetRegistry.update(txIqviaAsset);
  
  tx.distributor.accountBalance = tx.distributor.accountBalance+distri.tokenBalance;
  
  const distParticipantRegistry =  await getParticipantRegistry(NS + '.Distributor');
  await distParticipantRegistry.update(tx.distributor);
  
  txIqviaAsset.pharma.accountBalance = (txIqviaAsset.pharma.accountBalance - distri.tokenBalance);
  
  const pharmaParticipantRegistry =  await getParticipantRegistry(NS + '.Pharma');
  await pharmaParticipantRegistry.update(txIqviaAsset.pharma);
  return 0;
}


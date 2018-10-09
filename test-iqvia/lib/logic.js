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
    const assetRegistry = await getAssetRegistry('org.example.iqvia.moneyAllotedToUser');
    // Update the asset in the asset registry.
    await assetRegistry.update(tx.asset);

    // Emit an event for the modified asset.
    let event = getFactory().newEvent('org.example.iqvia', 'SampleEvent');
    event.asset = tx.asset;
    event.oldValue = oldValue;
    event.newValue = tx.newValue;
    emit(event);
}

const factory = getFactory();
const NS = 'org.example.iqvia';
/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.AddUserToChain} addUserToChain
 * @transaction
 */

function addUserToChain(tx) {
  var participant = NS + '.Patient';
  var user = factory.newResource(NS, 'Patient', 'someone@email.com');
  var ConceptAddress = factory.newConcept(NS, 'Address');
  ConceptAddress.country = 'INDIA';
  user.address = ConceptAddress;
  user.firstName = 'SOORAJ';
  user.lastName = 'NARAYANAN';
  user.password = 'aezakmi';
  user.accountBalance = 0;
  
  return getParticipantRegistry(participant)
  	.then(function(userRegistry) {
    	return userRegistry.addAll([user]);
  	});
}

/**
 * Sample transaction to add User to IQVIA Blockchain
 * @param {org.example.iqvia.AddPayerToChain} addPayerToChain
 * @transaction
 */

function addPayerToChain(tx) {
  var participant = NS + '.Charity';
  var charity = factory.newResource(NS, 'Charity', tx.email);
  var ConceptAddress = factory.newConcept(NS, 'Address');
  ConceptAddress.country = tx.address.country;
  ConceptAddress.city = tx.address.city;
  ConceptAddress.address = tx.address.address;
  ConceptAddress.mobile = tx.address.mobile;
  ConceptAddress.zip = tx.address.zip;
  charity.address = ConceptAddress;
  charity.firstName = tx.firstName;
  charity.lastName = tx.lastName;
  charity.password = tx.password;
  charity.transferBalance = tx.transferBalance;
  
  return getParticipantRegistry(participant)
  	.then(function(charityRegistry) {
    	return charityRegistry.addAll([charity]);
  	});
}
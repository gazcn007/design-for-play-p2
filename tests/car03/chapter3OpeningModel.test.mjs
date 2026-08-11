import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import * as openingContent from '../../src/cars/presentCity3d/chapter3OpeningContent.js';
import { createChapter3OpeningModel } from '../../src/cars/presentCity3d/chapter3OpeningModel.js';

function reachSeam(model, arrival = 'show-photograph') {
  assert.equal(model.chooseArrival(arrival), true);
  assert.equal(model.completeTrainDeparture(), true);
  assert.equal(model.completeLevIntroduction(), true);
  assert.equal(model.beginGuide(), true);
  assert.equal(model.completeExplorationBriefing(), true);
}

function reachEda(model) {
  reachSeam(model);
  assert.equal(model.observeSeam('geometry'), true);
  assert.equal(model.concludeSeam('deliberate'), true);
}

function reachOlek(model, approach = 'direct') {
  reachEda(model);
  assert.equal(model.approachEda(approach), true);
  assert.equal(model.noteEdaTopic('collector'), true);
  assert.equal(model.noteEdaTopic('authorization'), true);
  assert.equal(model.obtainEdaRecord(), true);
}

function completeOlek(model) {
  assert.equal(model.noteOlekTopic('destination'), true);
  assert.equal(model.noteOlekTopic('route'), true);
  assert.equal(model.completeOlekRoute(), true);
}

function completeSava(model) {
  assert.equal(model.noteSavaTopic('anonymous-use'), true);
  assert.equal(model.noteSavaTopic('mara-transaction'), true);
  assert.equal(model.noteSavaTopic('no-correction'), true);
  assert.equal(model.completeSava(), true);
}

function completeNika(model) {
  assert.equal(model.noteNikaTopic('timeline'), true);
  assert.equal(model.noteNikaTopic('reservation'), true);
  assert.equal(model.noteNikaTopic('discarded-print'), true);
  assert.equal(model.completeNika(), true);
}

describe('Chapter 3 interactions #1 to #33', () => {
  it('starts at the train door and protects its snapshots', () => {
    const model = createChapter3OpeningModel();
    const snapshot = model.snapshot();
    assert.equal(snapshot.phase, 'train-door');
    snapshot.phase = 'corrupted';
    snapshot.evidence.oilSeam = 'invented';
    assert.equal(model.snapshot().phase, 'train-door');
    assert.equal(model.snapshot().evidence.oilSeam, null);
  });

  it('converges all arrival choices while retaining how Butch exposes the Mara lead', () => {
    const approaches = {
      'ask-conductor': 'direct',
      'check-platform': 'observant',
      'show-photograph': 'open',
    };
    for (const [choice, approach] of Object.entries(approaches)) {
      const model = createChapter3OpeningModel();
      assert.equal(model.chooseArrival(choice), true);
      assert.equal(model.snapshot().arrivalApproach, approach);
      assert.equal(model.snapshot().maraPhotoShown, choice !== 'check-platform');
      assert.equal(model.completeTrainDeparture(), true);
      assert.equal(model.snapshot().phase, 'meet-lev');
    }
  });

  it('enforces the investigation order before the oil seam', () => {
    const model = createChapter3OpeningModel();
    assert.equal(model.completeLevIntroduction(), false);
    assert.equal(model.observeSeam('geometry'), false);
    reachSeam(model);
    assert.equal(model.snapshot().phase, 'inspect-dark-seam');
  });

  it('records multiple observations separately from the seam inference', () => {
    for (const inference of ['deliberate', 'cart-leak', 'reserve-judgment']) {
      const model = createChapter3OpeningModel();
      reachSeam(model, 'ask-conductor');
      assert.equal(model.concludeSeam(inference), false);
      assert.equal(model.observeSeam('geometry'), true);
      assert.equal(model.observeSeam('fuel'), true);
      const minuteBeforeReread = model.snapshot().clock.minuteOfDay;
      assert.equal(model.observeSeam('geometry'), false);
      assert.equal(model.snapshot().clock.minuteOfDay, minuteBeforeReread);
      assert.deepEqual(model.snapshot().seamObservations, ['geometry', 'fuel']);
      assert.equal(model.concludeSeam(inference), true);
      assert.equal(model.snapshot().seamInference, inference);
      assert.equal(model.snapshot().evidence.oilSeam, 'observed');
    }
  });

  it('gives every Eda approach an immediate tone state without removing the altered sales copy', () => {
    const cooperation = {
      direct: 'professional',
      patient: 'open',
      pressuring: 'guarded',
    };
    for (const [approach, expected] of Object.entries(cooperation)) {
      const model = createChapter3OpeningModel();
      reachEda(model);
      assert.equal(model.approachEda(approach), true);
      assert.equal(model.snapshot().edaCooperation, expected);
      assert.equal(model.obtainEdaRecord(), false);
      model.noteEdaTopic('collector');
      model.noteEdaTopic('authorization');
      assert.equal(model.obtainEdaRecord(), true);
      assert.equal(model.snapshot().evidence.maraSighting, 'corroborated');
      assert.equal(model.snapshot().evidence.lampOilSalesCopy, 'confirmed');
      assert.equal(model.snapshot().suspicions.edaActivelyConcealedBuyer, true);
      assert.equal(model.snapshot().phase, 'question-olek');
    }
  });

  it('keeps the handcart optional and requires Olek to establish destination and route', () => {
    const model = createChapter3OpeningModel();
    reachOlek(model);
    assert.equal(model.completeOlekRoute(), false);
    assert.equal(model.noteOlekTopic('destination'), true);
    assert.equal(model.completeOlekRoute(), false);
    assert.equal(model.noteOlekTopic('route'), true);
    assert.equal(model.completeOlekRoute(), true);
    assert.equal(model.snapshot().cartInspected, false);
    assert.equal(model.snapshot().evidence.deliveryRoute, 'confirmed');
    assert.equal(model.snapshot().suspicions.olekActivelyConcealedRoute, true);
  });

  it('allows the player to complete #7 without inspecting the optional solvent bottle', () => {
    const model = createChapter3OpeningModel();
    reachOlek(model, 'patient');
    completeOlek(model);
    assert.equal(model.snapshot().solventBottleObserved, false);
    assert.equal(model.reachTransportEntrance(), true);
    assert.equal(model.snapshot().batchComplete, false);
    assert.equal(model.enterTransportHall(), true);
    assert.equal(model.takeTransportNumber('M-17'), true);
    assert.equal(model.snapshot().batchComplete, true);
    assert.equal(model.snapshot().interaction07Complete, true);
    assert.equal(model.snapshot().transportNumber, 'M-17');
    assert.equal(model.snapshot().phase, 'sava-counter');
  });

  it('records each bottle conclusion as observed evidence rather than proof of use on the line', () => {
    for (const inference of ['same-order', 'overclaimed', 'bounded']) {
      const model = createChapter3OpeningModel();
      reachOlek(model);
      completeOlek(model);
      assert.equal(model.inspectBottle(inference), true);
      assert.equal(model.snapshot().bottleInference, inference);
      assert.equal(model.snapshot().evidence.solventBottle, 'observed');
      assert.equal(model.reachTransportEntrance(), true);
    }
  });

  it('starts the direct #7 playtest with prior evidence but before Toma admits Butch', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-07' });
    const state = model.snapshot();
    assert.equal(state.phase, 'transport-entrance');
    assert.equal(state.marketLeadComplete, true);
    assert.equal(state.transportEntranceReached, false);
    assert.equal(state.transportHallEntered, false);
    assert.equal(state.interaction07Complete, false);
    assert.equal(state.evidence.maraSighting, 'corroborated');
    assert.equal(state.evidence.lampOilSalesCopy, 'confirmed');
    assert.equal(state.evidence.deliveryRoute, 'confirmed');
  });

  it('enforces the #7 order: Toma, public hall, then number dispenser', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-07' });
    assert.equal(model.enterTransportHall(), false);
    assert.equal(model.takeTransportNumber(), false);
    assert.equal(model.reachTransportEntrance(), true);
    assert.equal(model.takeTransportNumber(), false);
    assert.equal(model.enterTransportHall(), true);
    assert.equal(model.takeTransportNumber(), true);
    assert.equal(model.takeTransportNumber(), false);
  });

  it('removes already-asked investigation topics while keeping the final action visible', () => {
    assert.deepEqual(
      openingContent.levTopicMenu(['lev-office', 'lev-oil']).choices.map((choice) => choice.id),
      ['lev-sighting', 'lev-role', 'lev-now'],
    );
    assert.deepEqual(
      openingContent.seamMenu(['geometry', 'fuel'], true).choices.map((choice) => choice.id),
      ['seam-cleaning', 'seam-conclude'],
    );
    assert.deepEqual(
      openingContent.edaTopicMenu('professional', ['product', 'collector']).choices.map((choice) => choice.id),
      ['eda-order', 'eda-authorization', 'eda-complaint', 'eda-record'],
    );
    assert.deepEqual(
      openingContent.olekTopicMenu(['destination', 'route']).choices.map((choice) => choice.id),
      ['olek-leak', 'olek-recipient', 'olek-done'],
    );
    assert.deepEqual(
      openingContent.savaTopicMenu(['anonymous-use', 'mara-transaction']).choices.map((choice) => choice.id),
      ['sava-code-history', 'sava-no-correction', 'sava-done'],
    );
    assert.deepEqual(
      openingContent.nikaTopicMenu(['timeline', 'discarded-print']).choices.map((choice) => choice.id),
      ['nika-reservation', 'nika-source-records', 'nika-done'],
    );
    assert.deepEqual(
      openingContent.plazaGrooveMenu(['rows', 'spacing']).choices.map((choice) => choice.id),
      ['groove-feed-gap', 'groove-conclude'],
    );
    assert.deepEqual(
      openingContent.petarTopicMenu(['instruction', 'route']).choices.map((choice) => choice.id),
      ['petar-surface-view', 'petar-cleaning', 'petar-done'],
    );
    assert.deepEqual(
      openingContent.secondTheoryMenu(['market-coordination', 'petar-knew-message']).choices.map((choice) => choice.id),
      ['second-municipal-censorship', 'second-lev-steered-case', 'second-conclude'],
    );
    assert.deepEqual(
      openingContent.cutInterfaceMenu(['cut', 'placement']).choices.map((choice) => choice.id),
      ['cut-reconnection', 'cut-conclude'],
    );
  });

  it('contains one absent Mara and no duplicate-person premise in the #1 to #14 runtime copy', () => {
    const copy = JSON.stringify(openingContent).toLowerCase();
    assert.equal(copy.includes('duplicate mara'), false);
    assert.equal(copy.includes('second mara'), false);
    assert.equal(copy.includes('both women'), false);
    assert.equal(copy.includes('mara, inside the train'), false);
    assert.match(copy, /unnecessary duplicate/);
  });

  it('starts #8 inside the ministry with all prior evidence and no Sava conclusion prefilled', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-08' });
    const state = model.snapshot();
    assert.equal(state.mode, 'transport-ministry-hall');
    assert.equal(state.phase, 'sava-counter');
    assert.equal(state.interaction07Complete, true);
    assert.equal(state.savaComplete, false);
    assert.equal(state.evidence.retiredCodePractice, null);
    assert.equal(model.noteNikaTopic('timeline'), false);
  });

  it('requires Sava to admit the standing practice, discovery time and deliberate non-correction', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-08' });
    model.noteSavaTopic('code-history');
    model.noteSavaTopic('anonymous-use');
    model.noteSavaTopic('mara-transaction');
    assert.equal(model.completeSava(), false);
    model.noteSavaTopic('no-correction');
    assert.equal(model.completeSava(), true);
    const state = model.snapshot();
    assert.equal(state.evidence.retiredCodePractice, 'confirmed-standing-practice');
    assert.equal(state.suspicions.savaLeftTransactionUncorrected, true);
  });

  it('keeps Bosko optional in the queue and requires Nika to disclose the discarded print', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-08' });
    completeSava(model);
    assert.equal(model.askBoskoInQueue(), true);
    assert.equal(model.askBoskoInQueue(), false);
    assert.equal(model.completeNika(), false);
    completeNika(model);
    const state = model.snapshot();
    assert.equal(state.evidence.eastboundReservation, 'm-venn-unconfirmed-identity');
    assert.equal(state.suspicions.nikaDiscardedPrintout, true);
    assert.equal(state.phase, 'inspect-discarded-print');
  });

  it('tests every first-theory framing against knowledge boundaries and converges on Bosko', () => {
    for (const theory of ['market-ministry', 'code-cover', 'planned-handoff']) {
      const model = createChapter3OpeningModel({ startAt: 'interaction-08' });
      completeSava(model);
      completeNika(model);
      assert.equal(model.testFirstTheory(theory), false);
      assert.equal(model.inspectDiscardedPrint(), true);
      assert.equal(model.leaveMinistryForTheory(), true);
      assert.equal(model.testFirstTheory(theory), true);
      assert.equal(model.snapshot().phase, 'question-bosko-square');
      assert.equal(model.snapshot().firstTheory, theory);
    }
  });

  it('requires Bosko before the groove inspection and all three groove facts before #14 completes', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-08' });
    completeSava(model);
    completeNika(model);
    model.inspectDiscardedPrint();
    model.leaveMinistryForTheory();
    model.testFirstTheory('market-ministry');
    assert.equal(model.observeGroove('rows'), false);
    assert.equal(model.completeSquareBosko(), true);
    assert.equal(model.snapshot().evidence.independentSquareSighting, 'mara-worked-alone');
    assert.equal(model.observeGroove('rows'), true);
    assert.equal(model.observeGroove('spacing'), true);
    assert.equal(model.concludeGrooves(), false);
    assert.equal(model.observeGroove('feed-gap'), true);
    assert.equal(model.concludeGrooves(), true);
    const state = model.snapshot();
    assert.equal(state.interaction14Complete, true);
    assert.equal(state.evidence.plazaGrooves, 'two-lines-second-feed-incomplete');
    assert.equal(state.phase, 'archive-entrance');
  });

  it('starts the direct #14 playtest at the plaza with every prior suspicion still bounded', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-14' });
    const state = model.snapshot();
    assert.equal(state.phase, 'inspect-plaza-grooves');
    assert.equal(state.firstTheoryTested, true);
    assert.equal(state.squareBoskoInterviewed, true);
    assert.equal(state.interaction14Complete, false);
    assert.equal(state.evidence.discardedMaintenancePrint, 'confirmed');
    assert.equal(state.evidence.plazaGrooves, null);
  });

  it('starts direct #15 outside the archive with the complete plaza result', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-15' });
    const state = model.snapshot();
    assert.equal(state.phase, 'archive-entrance');
    assert.equal(state.interaction14Complete, true);
    assert.equal(state.archiveEntranceReached, false);
    assert.equal(state.evidence.plazaGrooves, 'two-lines-second-feed-incomplete');
  });

  it('keeps Ana optional and orders map, maintenance order, Petar and timeline', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-15' });
    assert.equal(model.enterArchive(), false);
    assert.equal(model.reachArchiveEntrance(), true);
    assert.equal(model.enterArchive(), true);
    assert.equal(model.inspectMaintenanceOrder(), false);
    assert.equal(model.askAnaForMapHelp(), true);
    assert.equal(model.inspectArchiveMap(), true);
    assert.equal(model.askAnaForMapHelp(), false);
    assert.equal(model.inspectMaintenanceOrder(), true);
    assert.equal(model.inspectMaterialTimeline(), false);
    for (const topic of ['instruction', 'route', 'surface-view', 'cleaning']) {
      assert.equal(model.notePetarTopic(topic), true);
    }
    assert.equal(model.completePetarInterview(), true);
    assert.equal(model.inspectMaterialTimeline(), true);
    const state = model.snapshot();
    assert.equal(state.evidence.archiveFeedPlan, 'one-main-feed-one-short-branch');
    assert.equal(state.evidence.maintenanceOrder, 'isolate-unregistered-branch-petar-signed');
    assert.equal(state.evidence.petarCutBranch, 'confirmed-without-message-knowledge');
    assert.equal(state.evidence.materialTimeline, 'no-shared-meeting-or-knowledge');
    assert.equal(state.suspicions.petarCutBranch, true);
  });

  it('requires every second theory before revealing the dusk interface', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-21' });
    assert.equal(model.completeSecondTheory(), false);
    for (const theory of ['market-coordination', 'municipal-censorship', 'petar-knew-message']) {
      assert.equal(model.testSecondTheory(theory), true);
    }
    assert.equal(model.completeSecondTheory(), false);
    assert.equal(model.testSecondTheory('lev-steered-case'), true);
    assert.equal(model.completeSecondTheory(), true);
    assert.equal(model.snapshot().phase, 'inspect-cut-interface');
  });

  it('bounds #22 to a reconnectable interface with unknown authorship', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-22' });
    assert.equal(model.concludeCutInterface(), false);
    assert.equal(model.observeCutInterface('cut'), true);
    assert.equal(model.observeCutInterface('placement'), true);
    assert.equal(model.concludeCutInterface(), false);
    assert.equal(model.observeCutInterface('reconnection'), true);
    assert.equal(model.concludeCutInterface(), true);
    const state = model.snapshot();
    assert.equal(state.interaction22Complete, true);
    assert.equal(state.cutInterfaceConclusion, 'reconnectable-ends-prepared-by-unknown-person');
    assert.equal(state.evidence.cutInterface, 'reconnectable-origin-unknown');
    assert.equal(state.phase, 'hotel-entrance');
  });

  it('starts #23 at the hotel route and makes Hana establish three bounded facts', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-23' });
    assert.equal(model.snapshot().phase, 'enter-copper-heron');
    assert.equal(model.enterHotel(), true);
    assert.equal(model.snapshot().clock.time, 'DAY 1 · 18:00');
    assert.equal(model.completeHotelCheckIn(), false);
    for (const topic of ['register', 'alone', 'departure']) {
      assert.equal(model.noteHanaTopic(topic), true);
      assert.equal(model.noteHanaTopic(topic), false);
    }
    assert.equal(model.completeHotelCheckIn(), true);
    const state = model.snapshot();
    assert.equal(state.phase, 'question-daro');
    assert.equal(state.clock.time, 'DAY 1 · 18:03');
    assert.equal(state.evidence.hotelRegister, 'blank-line-standing-practice-mara-alone');
  });

  it('ships replaceable full-screen paper slots for archive and hotel evidence', () => {
    const viewer = readFileSync(
      new URL('../../src/cars/presentCity3d/Chapter3EvidenceViewer.js', import.meta.url),
      'utf8',
    );
    const html = readFileSync(new URL('../../car03-3d.html', import.meta.url), 'utf8');
    for (const id of ['archive-feed-plan', 'maintenance-order-c441', 'material-timeline', 'hotel-register', 'hotel-evidence-table']) {
      assert.match(viewer, new RegExp(id));
    }
    assert.match(viewer, /Escape/);
    assert.match(viewer, /PLACEHOLDER ART SLOT/);
    assert.match(html, /aria-modal="true"/);
    assert.match(viewer, /openReference\(documentSpec\)/);
    assert.match(html, /dialogue-reference/);
    assert.match(html, /id="evidence-close"/);
  });

  it('makes Lev initiate both conversations in the playable runtime', () => {
    const runtime = readFileSync(
      new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url),
      'utf8',
    );
    assert.equal(runtime.includes("id: 'meet-lev'"), false);
    assert.equal(runtime.includes("id: 'follow-lev'"), false);
    assert.match(runtime, /beginLevArrivalApproach\(\)/);
    assert.match(runtime, /this\.model\.completeLevIntroduction\(\);\s+this\.beginGuidedWalk\(\);/);
    assert.match(runtime, /beginApproach: \(\) => this\.beginEdaApproach\(\)/);
    assert.match(runtime, /this\.levWalkOnComplete = \(\) => this\.openEda\(\)/);
    assert.match(runtime, /id: 'sava-counter'/);
    assert.match(runtime, /id: 'discarded-maintenance-print'/);
    assert.match(runtime, /id: 'plaza-announcement-grooves'/);
    assert.match(runtime, /id: 'archive-entrance'/);
    assert.match(runtime, /id: 'archive-map-table'/);
    assert.match(runtime, /id: 'archive-petar'/);
    assert.match(runtime, /id: 'lev-second-theory'/);
    assert.match(runtime, /id: 'cut-feed-interface'/);
    assert.match(runtime, /id: 'copper-heron-entrance'/);
    assert.match(runtime, /id: 'hotel-register-hana'/);
  });

  it('keeps #24 guests optional and requires Daro to bound all three parts of his sightline', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-25' });
    assert.equal(model.snapshot().mode, 'copper-heron-lobby');
    const initialMinute = model.snapshot().clock.minuteOfDay;
    assert.equal(model.askHotelGuest('irena'), true);
    assert.equal(model.askHotelGuest('irena'), false);
    assert.equal(model.snapshot().clock.minuteOfDay, initialMinute + 1);
    assert.equal(model.completeDaro(), false);
    for (const topic of ['position', 'sequence', 'limits']) assert.equal(model.noteDaroTopic(topic), true);
    assert.equal(model.completeDaro(), true);
    assert.equal(model.snapshot().evidence.daroSightline, 'mara-alone-hotel-square-station');
    assert.deepEqual(model.snapshot().hotelGuestsAsked, ['irena']);
    assert.equal(model.testFinalTheory('market-help'), false);
    assert.equal(model.enterHotelRoom(), false);
    assert.equal(model.enterHotelCorridor(), true);
    assert.equal(model.snapshot().mode, 'copper-heron-corridor');
    assert.equal(model.enterHotelRoom(), true);
    assert.equal(model.snapshot().mode, 'copper-heron-private-room');
    assert.equal(model.testFinalTheory('market-help'), true);
  });

  it('rejects all five active-participation theories before allowing sleep', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-26' });
    assert.equal(model.completeEvidenceTable(), false);
    assert.equal(model.canReviewEvidenceTable(), true);
    const theoryPapers = {
      'market-help': 'issue-copy',
      'municipal-cover': 'order-c441',
      'petar-destroyed': 'oil-route',
      'lev-controlled': 'witness-notes',
      'mara-coerced': 'reservation',
    };
    for (const [theory, paper] of Object.entries(theoryPapers)) {
      assert.equal(model.testFinalTheory(theory), true);
      assert.equal(model.readHotelEvidencePaper(paper), true);
    }
    assert.equal(model.completeEvidenceTable(), true);
    assert.equal(model.snapshot().evidence.evidenceTable, 'mara-alone-knew-complete-sequence');
    assert.equal(model.sleepUntilNight(), true);
    assert.equal(model.snapshot().clock.time, 'DAY 2 · 00:40');
  });

  it('enforces first fire line, reconnection and second line in order', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-27' });
    assert.equal(model.beginNightRoute(), false);
    assert.equal(model.sleepUntilNight(), true);
    assert.equal(model.beginNightRoute(), false);
    assert.equal(model.reachNightLobby(), false);
    assert.equal(model.leaveNightRoom(), true);
    assert.equal(model.reachNightLobby(), true);
    assert.equal(model.beginNightRoute(), true);
    assert.equal(model.reconnectNightFeed(), false);
    assert.equal(model.observeNightFire(), true);
    assert.equal(model.completeNightMessage(), false);
    assert.equal(model.reconnectNightFeed(), true);
    assert.equal(model.completeNightMessage(), true);
    assert.equal(model.beginMorning(), true);
    assert.equal(model.snapshot().clock.time, 'DAY 2 · 06:20');
    assert.equal(model.askHanaAtBreakfast(), false);
    assert.equal(model.reachMorningLobby(), false);
    assert.equal(model.leaveMorningRoom(), true);
    assert.equal(model.reachMorningLobby(), true);
    assert.equal(model.askHanaAtBreakfast(), true);

    const runtime = readFileSync(
      new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url),
      'utf8',
    );
    const content = readFileSync(
      new URL('../../src/cars/presentCity3d/chapter3FinalContent.js', import.meta.url),
      'utf8',
    );
    assert.match(content, /nightIgnition: true/);
    assert.match(content, /I LEFT BY CHOICE\./);
    assert.match(content, /Those are not the same investigation\./);
    assert.match(runtime, /this\.nightIgnitionElapsed \/ 3\.6/);
    assert.match(runtime, /this\.nightIgnitionElapsed >= 5\.6/);
    assert.match(runtime, /setSecondIgnitionProgress\(this\.nightIgnitionProgress\)/);
    assert.match(runtime, /makeLine\("BUTCH, I'M ALIVE\.\", 2\.65/);
    assert.match(runtime, /makeLine\('I LEFT BY CHOICE\.', -2\.65/);
    assert.match(runtime, /fireLights: \[firstLight, secondLight\]/);
    assert.match(runtime, /this\.dialogue\.setAdvanceLocked\(true\)/);
    assert.match(runtime, /WATCH THE SECOND LINE IGNITE/);
  });

  it('makes the guest corridor readable without turning its background doors into interactions', () => {
    const hall = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3HotelHall.js', import.meta.url), 'utf8');
    const runtime = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');
    assert.match(hall, /const doorZs = \[4\.2, 1\.2, -1\.8, -4\.8\]/);
    assert.match(hall, /butchRoomDoor: \[0, 1\.25, -7\.08\]/);
    assert.match(hall, /new THREE\.BoxGeometry\(0\.2, 2\.8, 15\.2\)/);
    assert.match(hall, /backgroundDoors\.push\(door\)/);
    assert.match(hall, /const paperLayouts = \[/);
    assert.match(runtime, /id: 'hotel-private-room-door'/);
    assert.equal(runtime.includes('hotel-paper-${spec.id}'), false);
    assert.match(runtime, /onLineChange: \(line\) =>/);
    assert.match(runtime, /this\.evidenceViewer\.openReference\(documentSpec\)/);
    assert.match(runtime, /this\.hotelHall\.corridorGroup\.visible = upperFloor/);
    assert.match(runtime, /this\.hotelHall\.roomGroup\.visible = upperFloor/);
    assert.match(runtime, /id: 'hotel-night-room-door'/);
    assert.match(runtime, /id: 'hotel-night-corridor-stairs'/);
    assert.match(runtime, /id: 'hotel-night-exit'/);
    assert.match(runtime, /id: 'hotel-morning-exit'/);
    assert.match(runtime, /!this\.model\.snapshot\(\)\.morningStarted/);
    assert.match(hall, /lobbyStairArrival: \[-2\.35, 0\.5, 0\.7\]/);
    assert.match(runtime, /this\.switchHotelArea\('lobby', \{ arrival: 'stairs' \}\)/);
    assert.equal(runtime.includes('if (!interaction && state.nightRouteStarted && !state.nightMessageComplete) return true;'), false);
    assert.equal(runtime.includes("id: 'hotel-background-room-door'"), false);
    const model = createChapter3OpeningModel({ startAt: 'hotel-corridor-qa' });
    assert.equal(model.snapshot().mode, 'copper-heron-corridor');
    assert.equal(model.snapshot().hotelCorridorEntered, true);
    assert.equal(model.snapshot().hotelRoomEntered, false);
    assert.equal(model.enterHotelRoom(), true);

    const nightLobby = createChapter3OpeningModel({ startAt: 'night-lobby-qa' }).snapshot();
    assert.equal(nightLobby.clock.time, 'DAY 2 · 00:40');
    assert.equal(nightLobby.nightRoomLeft, true);
    assert.equal(nightLobby.nightLobbyReached, true);
    assert.equal(nightLobby.nightRouteStarted, false);

    const nightExterior = createChapter3OpeningModel({ startAt: 'night-exterior-qa' }).snapshot();
    assert.equal(nightExterior.mode, 'central-square-night');
    assert.equal(nightExterior.nightRouteStarted, true);

    const nightFire = createChapter3OpeningModel({ startAt: 'interaction-29' }).snapshot();
    assert.equal(nightFire.nightRoomLeft, true);
    assert.equal(nightFire.nightLobbyReached, true);
  });

  it('discovers the physical traces en route and converges the two morning tasks before Lev establishes the eastbound direction', () => {
    const model = createChapter3OpeningModel({ startAt: 'interaction-31' });
    assert.equal(model.confirmMorningEvidence(), false);
    assert.equal(model.leaveMorningRoom(), true);
    assert.equal(model.reachMorningLobby(), true);
    assert.equal(model.collectMorningReservation(), true);
    assert.equal(model.observeMorningEvidence('scorch'), false);
    assert.equal(model.noticeMorningFire(), true);
    for (const observation of ['scorch', 'connector', 'ash']) assert.equal(model.observeMorningEvidence(observation), true);
    assert.equal(model.confirmMorningEvidence(), true);
    assert.equal(model.snapshot().mode, 'morning-overlook-route');
    assert.equal(model.startSunriseClimb(), true);
    assert.equal(model.completeSunriseView(), true);
    assert.equal(model.snapshot().clock.time, 'DAY 2 · 06:42');
    assert.equal(model.returnFromSunrise(), true);
    assert.equal(model.snapshot().mode, 'station-approach');
    assert.equal(model.completeLevFinal(), false);
    for (const topic of ['message', 'methods', 'eastbound']) assert.equal(model.noteFinalTimelineTopic(topic), true);
    assert.equal(model.completeLevFinal(), true);
    assert.equal(model.snapshot().evidence.eastboundOriginal, 'mara-route-consistent-eastbound');
    assert.equal(model.snapshot().clock.time, 'DAY 2 · 07:05');

    const runtime = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');
    const content = readFileSync(new URL('../../src/cars/presentCity3d/chapter3FinalContent.js', import.meta.url), 'utf8');
    assert.match(runtime, /id: 'lev-morning-companion'/);
    assert.match(runtime, /MORNING_LEV_EXTERIOR_START = Object\.freeze\(\[48\.2, 0\.5, -11\.0\]\)/);
    assert.match(runtime, /startMorningLevFollow\(\)/);
    assert.match(runtime, /updateMorningLevFollow\(dt\)/);
    assert.match(runtime, /this\.morningLevTrail/);
    assert.match(runtime, /approach: \(\) => this\.morningLevApproach\(\)/);
    assert.match(runtime, /id: 'morning-original-reservation'/);
    assert.match(runtime, /id: 'sunrise-overlook-trail'/);
    assert.match(runtime, /id: 'sunrise-overlook-bench'/);
    assert.match(runtime, /id: 'sunrise-overlook-return'/);
    assert.match(runtime, /updateSunriseOverlook\(dt\)/);
    assert.match(runtime, /updateMorningRouteInterruption\(\)/);
    assert.match(runtime, /Compare the fire with Lev’s reservation/);
    assert.doesNotMatch(runtime, /this\.lev\.position\.set\(-6\.5, 0\.5, 28\.2\)/);
    assert.match(content, /I am coming with you/);
    assert.match(content, /The public terminal shortens handwritten names/);
    assert.match(content, /five minutes in which nobody asks either of us a question/);
    assert.match(content, /Lev stands beside the burned grooves/);
  });

  it('keeps the train door hidden until boarding and gives the chapter a visible end card', () => {
    const runtime = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');
    assert.match(runtime, /outline: this\.finalTrainOutline/);
    assert.doesNotMatch(runtime, /if \(initial\.levFinalComplete\) \{\s*this\.finalDoor\.group\.visible = true/);
    assert.equal((runtime.match(/this\.finalDoor\.group\.visible = true/g) || []).length, 1);
    assert.match(runtime, /CHAPTER 03 COMPLETE/);
    assert.match(runtime, /next\.chapterComplete.*chapterEndCard/);
  });

  it('keeps continuation attitude separate from the fixed solo departure choreography', () => {
    for (const attitude of ['need-reason', 'safety', 'cannot-stop']) {
      const model = createChapter3OpeningModel({ startAt: 'interaction-33' });
      assert.equal(model.chooseContinuationAttitude(attitude), true);
      assert.equal(model.boardTrain(), true);
      model.advanceDeparture(4999);
      assert.equal(model.snapshot().phase, 'door-relay');
      model.advanceDeparture(1);
      assert.equal(model.snapshot().phase, 'door-closing');
      model.advanceDeparture(4000);
      assert.equal(model.snapshot().phase, 'door-latch');
      model.advanceDeparture(2200);
      assert.equal(model.snapshot().phase, 'train-moving');
      model.advanceDeparture(10400);
      assert.equal(model.snapshot().phase, 'black-audio-tail');
      assert.equal(model.snapshot().blackout, true);
      model.advanceDeparture(2000);
      assert.equal(model.snapshot().chapterComplete, true);
      assert.equal(model.snapshot().audioSilent, true);
    }
  });

  it('ships a single-Mara ending route with the exact two ground messages', () => {
    const content = readFileSync(new URL('../../src/cars/presentCity3d/chapter3FinalContent.js', import.meta.url), 'utf8');
    const runtime = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');
    assert.match(runtime, /BUTCH, I'M ALIVE\./);
    assert.match(runtime, /I LEFT BY CHOICE\./);
    assert.match(runtime, /maraPresent: false/);
    assert.doesNotMatch(`${content}\n${runtime}`, /two Maras|second Mara|Mara double/i);
    for (const id of ['hotel-daro-window', 'hotel-evidence-table', 'night-burning-message', 'morning-fire-evidence', 'lev-final-reconstruction', 'eastbound-train']) {
      assert.match(runtime, new RegExp(`id: '${id}'`));
    }
  });

  it('uses a dialogue-bound oil tableau instead of a literal 3D sunrise disc', () => {
    const html = readFileSync(new URL('../../car03-3d.html', import.meta.url), 'utf8');
    const runtime = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');
    assert.match(html, /id="sunrise-tableau"/);
    assert.match(html, /ch03-sunrise-overlook-oil-v1\.png/);
    assert.match(runtime, /onComplete: \(\) => this\.completeSunriseView\(\)/);
    assert.match(runtime, /showSunriseTableau\(\)/);
    assert.doesNotMatch(runtime, /sunrise-disc-placeholder|SphereGeometry\(1\.35/);
  });

  it('keeps the dusk campfire gathering optional and outside evidence state', () => {
    const model = createChapter3OpeningModel({ startAt: 'dusk-campfire-qa' });
    const before = model.snapshot();
    assert.equal(before.clock.period, 'DUSK');
    model.advanceDialogueTime('campfire-rada', 2);
    const after = model.snapshot();
    assert.equal(after.clock.minuteOfDay - before.clock.minuteOfDay, 2);
    assert.deepEqual(after.evidence, before.evidence);

    const runtime = readFileSync(new URL('../../src/cars/presentCity3d/Chapter3OpeningRuntime.js', import.meta.url), 'utf8');
    for (const id of ['campfire-rada', 'campfire-miro', 'campfire-seline', 'campfire-kettle']) {
      assert.match(runtime, new RegExp(`id: '${id}'`));
    }
  });
});

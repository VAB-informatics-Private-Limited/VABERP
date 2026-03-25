import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateLocationsTable1742000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create countries table
    await queryRunner.createTable(
      new Table({
        name: 'countries',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar' },
          { name: 'code', type: 'varchar', length: '10' },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_date', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'modified_date', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Create states table
    await queryRunner.createTable(
      new Table({
        name: 'states',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'country_id', type: 'int' },
          { name: 'name', type: 'varchar' },
          { name: 'code', type: 'varchar', length: '10', isNullable: true },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_date', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'modified_date', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'states',
      new TableForeignKey({
        columnNames: ['country_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'countries',
        onDelete: 'CASCADE',
      }),
    );

    // Create cities table
    await queryRunner.createTable(
      new Table({
        name: 'cities',
        columns: [
          { name: 'id', type: 'int', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'state_id', type: 'int' },
          { name: 'name', type: 'varchar' },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'created_date', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'modified_date', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'cities',
      new TableForeignKey({
        columnNames: ['state_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'states',
        onDelete: 'CASCADE',
      }),
    );

    // Seed India
    await queryRunner.query(`INSERT INTO countries (name, code) VALUES ('India', 'IN')`);
    const countryResult = await queryRunner.query(`SELECT id FROM countries WHERE code = 'IN' LIMIT 1`);
    const countryId = countryResult[0].id;

    // Seed all Indian States and Union Territories
    const states = [
      { name: 'Andhra Pradesh', code: 'AP' },
      { name: 'Arunachal Pradesh', code: 'AR' },
      { name: 'Assam', code: 'AS' },
      { name: 'Bihar', code: 'BR' },
      { name: 'Chhattisgarh', code: 'CG' },
      { name: 'Goa', code: 'GA' },
      { name: 'Gujarat', code: 'GJ' },
      { name: 'Haryana', code: 'HR' },
      { name: 'Himachal Pradesh', code: 'HP' },
      { name: 'Jharkhand', code: 'JH' },
      { name: 'Karnataka', code: 'KA' },
      { name: 'Kerala', code: 'KL' },
      { name: 'Madhya Pradesh', code: 'MP' },
      { name: 'Maharashtra', code: 'MH' },
      { name: 'Manipur', code: 'MN' },
      { name: 'Meghalaya', code: 'ML' },
      { name: 'Mizoram', code: 'MZ' },
      { name: 'Nagaland', code: 'NL' },
      { name: 'Odisha', code: 'OD' },
      { name: 'Punjab', code: 'PB' },
      { name: 'Rajasthan', code: 'RJ' },
      { name: 'Sikkim', code: 'SK' },
      { name: 'Tamil Nadu', code: 'TN' },
      { name: 'Telangana', code: 'TS' },
      { name: 'Tripura', code: 'TR' },
      { name: 'Uttar Pradesh', code: 'UP' },
      { name: 'Uttarakhand', code: 'UK' },
      { name: 'West Bengal', code: 'WB' },
      { name: 'Andaman and Nicobar Islands', code: 'AN' },
      { name: 'Chandigarh', code: 'CH' },
      { name: 'Dadra and Nagar Haveli and Daman and Diu', code: 'DN' },
      { name: 'Delhi', code: 'DL' },
      { name: 'Jammu and Kashmir', code: 'JK' },
      { name: 'Ladakh', code: 'LA' },
      { name: 'Lakshadweep', code: 'LD' },
      { name: 'Puducherry', code: 'PY' },
    ];

    for (const state of states) {
      await queryRunner.query(
        `INSERT INTO states (country_id, name, code) VALUES ($1, $2, $3)`,
        [countryId, state.name, state.code],
      );
    }

    // Helper to get state id by code
    const getStateId = async (code: string): Promise<number> => {
      const result = await queryRunner.query(
        `SELECT id FROM states WHERE code = $1 AND country_id = $2 LIMIT 1`,
        [code, countryId],
      );
      return result[0]?.id;
    };

    // Seed cities by state
    const cityData: { stateCode: string; cities: string[] }[] = [
      {
        stateCode: 'AP',
        cities: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Kurnool', 'Rajahmundry', 'Kakinada'],
      },
      {
        stateCode: 'AR',
        cities: ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang'],
      },
      {
        stateCode: 'AS',
        cities: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur'],
      },
      {
        stateCode: 'BR',
        cities: ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Ara'],
      },
      {
        stateCode: 'CG',
        cities: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur'],
      },
      {
        stateCode: 'GA',
        cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
      },
      {
        stateCode: 'GJ',
        cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand', 'Navsari'],
      },
      {
        stateCode: 'HR',
        cities: ['Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula'],
      },
      {
        stateCode: 'HP',
        cities: ['Shimla', 'Manali', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Baddi'],
      },
      {
        stateCode: 'JH',
        cities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih'],
      },
      {
        stateCode: 'KA',
        cities: ['Bengaluru', 'Mysuru', 'Hubli', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Ballari', 'Tumkur', 'Shivamogga', 'Davanagere'],
      },
      {
        stateCode: 'KL',
        cities: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kannur', 'Kollam', 'Palakkad', 'Alappuzha', 'Malappuram'],
      },
      {
        stateCode: 'MP',
        cities: ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Rewa', 'Satna', 'Dewas', 'Ratlam'],
      },
      {
        stateCode: 'MH',
        cities: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Thane', 'Solapur', 'Kolhapur', 'Amravati', 'Navi Mumbai', 'Pimpri-Chinchwad', 'Vasai-Virar'],
      },
      {
        stateCode: 'MN',
        cities: ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur'],
      },
      {
        stateCode: 'ML',
        cities: ['Shillong', 'Tura', 'Nongstoin', 'Jowai'],
      },
      {
        stateCode: 'MZ',
        cities: ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip'],
      },
      {
        stateCode: 'NL',
        cities: ['Kohima', 'Dimapur', 'Mokokchung', 'Wokha'],
      },
      {
        stateCode: 'OD',
        cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak'],
      },
      {
        stateCode: 'PB',
        cities: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur'],
      },
      {
        stateCode: 'RJ',
        cities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bhilwara', 'Bharatpur', 'Sikar'],
      },
      {
        stateCode: 'SK',
        cities: ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan'],
      },
      {
        stateCode: 'TN',
        cities: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Tiruppur', 'Vellore', 'Erode', 'Thoothukudi'],
      },
      {
        stateCode: 'TS',
        cities: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Mahbubnagar', 'Ramagundam', 'Secunderabad'],
      },
      {
        stateCode: 'TR',
        cities: ['Agartala', 'Dharmanagar', 'Udaipur', 'Kailashahar'],
      },
      {
        stateCode: 'UP',
        cities: ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Prayagraj', 'Meerut', 'Noida', 'Ghaziabad', 'Bareilly', 'Aligarh', 'Moradabad', 'Mathura', 'Gorakhpur', 'Firozabad'],
      },
      {
        stateCode: 'UK',
        cities: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh', 'Kashipur', 'Rudrapur'],
      },
      {
        stateCode: 'WB',
        cities: ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Baharampur'],
      },
      {
        stateCode: 'AN',
        cities: ['Port Blair', 'Diglipur', 'Rangat'],
      },
      {
        stateCode: 'CH',
        cities: ['Chandigarh'],
      },
      {
        stateCode: 'DN',
        cities: ['Daman', 'Silvassa', 'Diu'],
      },
      {
        stateCode: 'DL',
        cities: ['New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Janakpuri', 'Pitampura'],
      },
      {
        stateCode: 'JK',
        cities: ['Srinagar', 'Jammu', 'Sopore', 'Anantnag', 'Baramulla', 'Udhampur'],
      },
      {
        stateCode: 'LA',
        cities: ['Leh', 'Kargil'],
      },
      {
        stateCode: 'LD',
        cities: ['Kavaratti', 'Agatti', 'Amini'],
      },
      {
        stateCode: 'PY',
        cities: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'],
      },
    ];

    for (const entry of cityData) {
      const stateId = await getStateId(entry.stateCode);
      if (!stateId) continue;
      for (const cityName of entry.cities) {
        await queryRunner.query(
          `INSERT INTO cities (state_id, name) VALUES ($1, $2)`,
          [stateId, cityName],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const citiesTable = await queryRunner.getTable('cities');
    if (citiesTable) {
      const fk = citiesTable.foreignKeys.find((k) => k.columnNames.includes('state_id'));
      if (fk) await queryRunner.dropForeignKey('cities', fk);
    }
    await queryRunner.dropTable('cities', true);

    const statesTable = await queryRunner.getTable('states');
    if (statesTable) {
      const fk = statesTable.foreignKeys.find((k) => k.columnNames.includes('country_id'));
      if (fk) await queryRunner.dropForeignKey('states', fk);
    }
    await queryRunner.dropTable('states', true);

    await queryRunner.dropTable('countries', true);
  }
}
